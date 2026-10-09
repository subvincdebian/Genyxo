import { INestApplicationContext, Logger } from "@nestjs/common";
import { IoAdapter } from "@nestjs/platform-socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";
import { Server, ServerOptions } from "socket.io";

export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private readonly pubClient: Redis;
  private readonly subClient: Redis;
  private adapterConstructor?: ReturnType<typeof createAdapter>;

  constructor(app: INestApplicationContext | object, redis: Redis) {
    super(app);
    // Dedicated clients prevent subscription mode and shutdown from affecting
    // the application's shared cache connection.
    const options = {
      lazyConnect: true,
      enableReadyCheck: true,
      // Adapter subscriptions are long-lived and restored by ioredis on
      // reconnect; the cache client's short command timeout does not apply.
      commandTimeout: undefined,
    };
    this.pubClient = redis.duplicate(options);
    this.subClient = redis.duplicate(options);
    // The Redis adapter issues commands without awaiting their promises. Attach
    // a rejection handler so disconnects or Redis errors cannot crash Node.
    for (const client of [this.pubClient, this.subClient]) {
      const sendCommand = client.sendCommand.bind(client);
      client.sendCommand = (command, stream) => {
        void command.promise.catch(() => {
          this.logger.error("Socket.IO Redis command failed");
        });
        return sendCommand(command, stream);
      };
    }
    this.pubClient.on("error", () => {
      this.logger.error("Socket.IO Redis publisher connection error");
    });
    this.subClient.on("error", () => {
      this.logger.error("Socket.IO Redis subscriber connection error");
    });
  }

  async connect(): Promise<void> {
    try {
      await Promise.all([this.pubClient.connect(), this.subClient.connect()]);
      this.adapterConstructor = createAdapter(this.pubClient, this.subClient);
    } catch {
      await this.dispose();
      // Do not expose connection URLs or credentials in startup errors.
      throw new Error("Failed to connect the Socket.IO Redis adapter");
    }
  }

  createIOServer(port: number, options?: Partial<ServerOptions>): Server {
    if (!this.adapterConstructor) {
      throw new Error(
        "Socket.IO Redis adapter must connect before initialization",
      );
    }
    const server: Server = super.createIOServer(port, options);
    server.adapter(this.adapterConstructor);
    return server;
  }

  dispose(): Promise<void> {
    // Nest closes Socket.IO namespaces before disposing its adapter. Stop the
    // dedicated clients even when Redis is unavailable, without retrying quit.
    this.pubClient.disconnect();
    this.subClient.disconnect();
    this.adapterConstructor = undefined;
    return Promise.resolve();
  }
}
