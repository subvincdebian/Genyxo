import { createServer } from "node:http";
import { Logger } from "@nestjs/common";
import Redis, { Command } from "ioredis";
import { Server } from "socket.io";
import { RedisIoAdapter } from "./redis-io.adapter";

describe("RedisIoAdapter", () => {
  let sharedRedis: Redis;
  let clients: Redis[];
  let adapters: RedisIoAdapter[];
  let servers: Server[];
  let sockets: WebSocket[];

  beforeEach(() => {
    clients = [];
    adapters = [];
    servers = [];
    sockets = [];
    sharedRedis = new Redis({ lazyConnect: true });
    jest.spyOn(sharedRedis, "duplicate").mockImplementation((options) => {
      const client = new Redis({ ...options, lazyConnect: true });
      jest
        .spyOn(client, "sendCommand")
        .mockImplementation((command) => command.promise);
      jest.spyOn(client, "connect").mockResolvedValue(undefined);
      jest.spyOn(client, "disconnect");
      jest.spyOn(client, "psubscribe").mockResolvedValue(1);
      jest.spyOn(client, "subscribe").mockResolvedValue(1);
      jest.spyOn(client, "punsubscribe").mockResolvedValue(0);
      jest.spyOn(client, "unsubscribe").mockResolvedValue(0);
      jest.spyOn(client, "publish").mockImplementation((channel, message) => {
        // An in-memory Redis pub/sub bus exercises the real adapter protocol.
        for (const subscriber of clients) {
          subscriber.emit(
            "pmessageBuffer",
            Buffer.from("socket.io#*"),
            Buffer.from(channel),
            Buffer.from(message),
          );
        }
        return Promise.resolve(clients.length);
      });
      clients.push(client);
      return client;
    });
  });

  afterEach(async () => {
    sockets.forEach((socket) => socket.close());
    await Promise.all(
      servers.map(
        (server) =>
          new Promise<void>((resolve) => {
            void server.close(() => resolve());
          }),
      ),
    );
    await Promise.all(adapters.map((adapter) => adapter.dispose()));
    sharedRedis.disconnect();
    jest.restoreAllMocks();
  });

  function createReplica() {
    const httpServer = createServer();
    const adapter = new RedisIoAdapter(httpServer, sharedRedis);
    adapters.push(adapter);
    return { httpServer, adapter };
  }

  it("delivers a user-room notification to a socket connected to another replica", async () => {
    const first = createReplica();
    const second = createReplica();
    await Promise.all([first.adapter.connect(), second.adapter.connect()]);
    const firstServer = first.adapter.createIOServer(0);
    const secondServer = second.adapter.createIOServer(0);
    servers.push(firstServer, secondServer);
    const remoteNamespace = secondServer.of("/notifications");
    remoteNamespace.on("connection", (socket) => {
      void socket.join("user_7");
    });
    const namespaceReady = new Promise<void>((resolve) => {
      remoteNamespace.once("connection", () => resolve());
    });
    await new Promise<void>((resolve) =>
      second.httpServer.listen(0, "127.0.0.1", resolve),
    );
    const address = second.httpServer.address();
    if (!address || typeof address === "string")
      throw new Error("Missing test port");
    const socket = new WebSocket(
      `ws://127.0.0.1:${address.port}/socket.io/?EIO=4&transport=websocket`,
    );
    sockets.push(socket);
    socket.addEventListener("message", (event) => {
      const message = String(event.data);
      if (message.startsWith("0")) socket.send("40/notifications,");
    });
    await namespaceReady;
    const received = new Promise<string>((resolve) => {
      socket.addEventListener("message", (event) => {
        const message = String(event.data);
        if (message.startsWith("42/notifications,")) resolve(message);
      });
    });

    firstServer
      .of("/notifications")
      .to("user_8")
      .emit("new_notification", { title: "Other user" });
    firstServer
      .of("/notifications")
      .to("user_7")
      .emit("new_notification", { title: "Hello" });

    expect(await received).toBe(
      '42/notifications,["new_notification",{"title":"Hello"}]',
    );
    expect(jest.spyOn(sharedRedis, "duplicate")).toHaveBeenCalledTimes(4);
    expect(jest.spyOn(clients[0], "publish")).toHaveBeenCalledWith(
      "socket.io#/notifications#user_7#",
      expect.any(Buffer),
    );
  });

  it("requires Redis readiness before creating a server", () => {
    const { adapter } = createReplica();
    expect(() => adapter.createIOServer(0)).toThrow(
      "must connect before initialization",
    );
  });

  it("closes dedicated clients on disposal without closing shared Redis", async () => {
    const { adapter } = createReplica();
    const sharedDisconnect = jest.spyOn(sharedRedis, "disconnect");
    await adapter.connect();
    await adapter.dispose();
    clients.forEach((client) =>
      expect(jest.spyOn(client, "disconnect")).toHaveBeenCalled(),
    );
    expect(sharedDisconnect).not.toHaveBeenCalled();
    expect(() => adapter.createIOServer(0)).toThrow(
      "must connect before initialization",
    );
  });

  it("cleans up both clients and redacts a failed startup connection", async () => {
    const { adapter } = createReplica();
    jest
      .spyOn(clients[1], "connect")
      .mockRejectedValueOnce(
        new Error("Connection failed: redis://secret-password@private-host"),
      );
    await expect(adapter.connect()).rejects.toThrow(
      "Failed to connect the Socket.IO Redis adapter",
    );
    clients.forEach((client) =>
      expect(jest.spyOn(client, "disconnect")).toHaveBeenCalled(),
    );
    expect(() => adapter.createIOServer(0)).toThrow(
      "must connect before initialization",
    );
  });

  it("handles fire-and-forget command failures without exposing Redis secrets", async () => {
    createReplica();
    const logError = jest.spyOn(Logger.prototype, "error").mockImplementation();
    const command = new Command("publish", [
      "socket.io#/notifications#",
      "event",
    ]);
    clients[0].sendCommand(command);
    command.reject(new Error("Redis error: secret-password@private-host"));
    await Promise.resolve();
    expect(logError).toHaveBeenCalledWith("Socket.IO Redis command failed");
  });
});
