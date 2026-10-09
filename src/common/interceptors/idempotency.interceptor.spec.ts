import {
  ExecutionContext,
  CallHandler,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RedisService } from "@liaoliaots/nestjs-redis";
import { of, throwError, lastValueFrom } from "rxjs";
import { IdempotencyInterceptor } from "./idempotency.interceptor";

describe("IdempotencyInterceptor", () => {
  let interceptor: IdempotencyInterceptor;
  let reflector: Reflector;
  let redisService: RedisService;
  let redisMock: any;

  beforeEach(() => {
    reflector = new Reflector();
    redisMock = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };
    redisService = {
      getOrThrow: jest.fn().mockReturnValue(redisMock),
    } as any;
    interceptor = new IdempotencyInterceptor(reflector, redisService);
  });

  const createMockContext = (
    headers: Record<string, any> = {},
    user: any = { id: 42 },
  ) => {
    const req = {
      headers,
      user,
      method: "POST",
      url: "/payment/buy",
    };
    const reply = {
      header: jest.fn(),
      status: jest.fn().mockReturnThis(),
      statusCode: 200,
    };
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => reply,
      }),
    } as unknown as ExecutionContext;
  };

  it("should pass through when endpoint has no @Idempotent decorator", async () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(undefined);
    const context = createMockContext();
    const next: CallHandler = { handle: () => of({ success: true }) };

    const result$ = await interceptor.intercept(context, next);
    const result = await lastValueFrom(result$);

    expect(result).toEqual({ success: true });
    expect(redisMock.get).not.toHaveBeenCalled();
  });

  it("should throw BadRequestException when required Idempotency-Key is missing", async () => {
    jest
      .spyOn(reflector, "getAllAndOverride")
      .mockReturnValue({ required: true });
    const context = createMockContext({});
    const next: CallHandler = { handle: () => of({ success: true }) };

    await expect(interceptor.intercept(context, next)).rejects.toThrow(
      BadRequestException,
    );
  });

  it("should proceed when optional Idempotency-Key is missing", async () => {
    jest
      .spyOn(reflector, "getAllAndOverride")
      .mockReturnValue({ required: false });
    const context = createMockContext({});
    const next: CallHandler = { handle: () => of({ success: true }) };

    const result$ = await interceptor.intercept(context, next);
    const result = await lastValueFrom(result$);

    expect(result).toEqual({ success: true });
    expect(redisMock.get).not.toHaveBeenCalled();
  });

  it("should throw ConflictException if request with key is currently IN_FLIGHT", async () => {
    jest
      .spyOn(reflector, "getAllAndOverride")
      .mockReturnValue({ required: true });
    const context = createMockContext({ "idempotency-key": "req-uuid-12345" });
    const next: CallHandler = { handle: () => of({ success: true }) };

    redisMock.get.mockResolvedValue(JSON.stringify({ status: "IN_FLIGHT" }));

    await expect(interceptor.intercept(context, next)).rejects.toThrow(
      ConflictException,
    );
  });

  it("should return cached response if key is already COMPLETED", async () => {
    jest
      .spyOn(reflector, "getAllAndOverride")
      .mockReturnValue({ required: true });
    const context = createMockContext({ "idempotency-key": "req-uuid-12345" });
    const next: CallHandler = { handle: () => of({ fresh: true }) };

    redisMock.get.mockResolvedValue(
      JSON.stringify({
        status: "COMPLETED",
        statusCode: 201,
        body: { cached: true },
      }),
    );

    const result$ = await interceptor.intercept(context, next);
    const result = await lastValueFrom(result$);

    expect(result).toEqual({ cached: true });
    expect(redisMock.set).not.toHaveBeenCalled();
  });

  it("should acquire lock, execute handler and cache response on new key", async () => {
    jest
      .spyOn(reflector, "getAllAndOverride")
      .mockReturnValue({ required: true, ttlSeconds: 3600 });
    const context = createMockContext({ "idempotency-key": "req-uuid-12345" });
    const next: CallHandler = { handle: () => of({ created: true }) };

    redisMock.get.mockResolvedValue(null);
    redisMock.set.mockResolvedValue("OK");

    const result$ = await interceptor.intercept(context, next);
    const result = await lastValueFrom(result$);

    expect(result).toEqual({ created: true });
    expect(redisMock.set).toHaveBeenCalledTimes(2);
    expect(redisMock.set).toHaveBeenNthCalledWith(
      1,
      "idempotency:42:POST:/payment/buy:req-uuid-12345",
      expect.stringContaining('"status":"IN_FLIGHT"'),
      "EX",
      120,
      "NX",
    );
    expect(redisMock.set).toHaveBeenNthCalledWith(
      2,
      "idempotency:42:POST:/payment/buy:req-uuid-12345",
      expect.stringContaining('"status":"COMPLETED"'),
      "EX",
      3600,
    );
  });

  it("should release in-flight lock on error so retries can occur", async () => {
    jest
      .spyOn(reflector, "getAllAndOverride")
      .mockReturnValue({ required: true });
    const context = createMockContext({ "idempotency-key": "req-uuid-12345" });
    const next: CallHandler = {
      handle: () => throwError(() => new Error("Database timeout")),
    };

    redisMock.get.mockResolvedValue(null);
    redisMock.set.mockResolvedValue("OK");
    redisMock.del.mockResolvedValue(1);

    const result$ = await interceptor.intercept(context, next);

    await expect(lastValueFrom(result$)).rejects.toThrow("Database timeout");
    expect(redisMock.del).toHaveBeenCalledWith(
      "idempotency:42:POST:/payment/buy:req-uuid-12345",
    );
  });
});
