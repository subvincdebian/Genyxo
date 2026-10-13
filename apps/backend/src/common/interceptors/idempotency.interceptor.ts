import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
  ConflictException,
  Logger,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RedisService } from "@liaoliaots/nestjs-redis";
import { Observable, of, throwError } from "rxjs";
import { tap, catchError } from "rxjs/operators";
import {
  IDEMPOTENT_KEY,
  IdempotentOptions,
} from "../decorators/idempotent.decorator";

interface IdempotentRecord {
  status: "IN_FLIGHT" | "COMPLETED";
  statusCode?: number;
  body?: any;
  createdAt?: number;
  completedAt?: number;
}

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly logger = new Logger(IdempotencyInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: RedisService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const options = this.reflector.getAllAndOverride<
      IdempotentOptions | undefined
    >(IDEMPOTENT_KEY, [context.getHandler(), context.getClass()]);

    if (!options) {
      return next.handle();
    }

    const http = context.switchToHttp();
    const req = http.getRequest<any>();
    const reply = http.getResponse<any>();

    const headerName = options.headerName || "idempotency-key";
    const rawHeader = req.headers?.[headerName];
    const idempotencyKey = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;

    if (!idempotencyKey) {
      if (options.required !== false) {
        throw new BadRequestException(
          `Missing required "${headerName}" header for this operation.`,
        );
      }
      return next.handle();
    }

    if (
      typeof idempotencyKey !== "string" ||
      idempotencyKey.trim().length < 8 ||
      idempotencyKey.trim().length > 128
    ) {
      throw new BadRequestException(
        `Invalid "${headerName}" format. Must be between 8 and 128 characters.`,
      );
    }

    const sanitizedKey = idempotencyKey.trim();
    const userId = req.user?.id ? String(req.user.id) : "anon";
    const method = (req.method || "POST").toUpperCase();
    const route = req.url ? req.url.split("?")[0] : "/";
    const redisKey = `idempotency:${userId}:${method}:${route}:${sanitizedKey}`;

    const client = this.redisService.getOrThrow();

    // 1. Check existing state in Redis
    try {
      const existing = await client.get(redisKey);
      if (existing) {
        const record = JSON.parse(existing) as IdempotentRecord;
        if (record.status === "IN_FLIGHT") {
          throw new ConflictException(
            "A request with this Idempotency-Key is currently being processed. Please retry shortly.",
          );
        }

        if (record.status === "COMPLETED") {
          if (reply && typeof reply.header === "function") {
            reply.header("X-Cache-Lookup", "HIT-IDEMPOTENT");
          }
          if (
            reply &&
            typeof reply.status === "function" &&
            record.statusCode
          ) {
            reply.status(record.statusCode);
          }
          return of(record.body);
        }
      }
    } catch (err: any) {
      if (err instanceof ConflictException) {
        throw err;
      }
      this.logger.warn(
        `Idempotency cache lookup error for key "${redisKey}": ${err.message}`,
      );
    }

    // 2. Acquire atomic lock
    const inFlightPayload: IdempotentRecord = {
      status: "IN_FLIGHT",
      createdAt: Date.now(),
    };

    let acquired: string | null = null;
    try {
      acquired = await client.set(
        redisKey,
        JSON.stringify(inFlightPayload),
        "EX",
        120,
        "NX",
      );
    } catch (err: any) {
      this.logger.error(
        `Failed to acquire idempotency lock for "${redisKey}": ${err.message}`,
      );
      // Fail-open or continue if Redis is degraded
      return next.handle();
    }

    if (acquired !== "OK") {
      throw new ConflictException(
        "A request with this Idempotency-Key is currently being processed. Please retry shortly.",
      );
    }

    const ttl = options.ttlSeconds ?? 86400;

    // 3. Execute downstream handler and store result or release lock
    return next.handle().pipe(
      tap((responseBody) => {
        void (async () => {
          try {
            const statusCode =
              reply?.statusCode ||
              reply?.status?.() ||
              req?.res?.statusCode ||
              200;
            const completedRecord: IdempotentRecord = {
              status: "COMPLETED",
              statusCode: typeof statusCode === "number" ? statusCode : 200,
              body: responseBody,
              completedAt: Date.now(),
            };
            await client.set(
              redisKey,
              JSON.stringify(completedRecord),
              "EX",
              ttl,
            );
          } catch (cacheErr: any) {
            this.logger.warn(
              `Failed to store completed idempotent response for "${redisKey}": ${cacheErr.message}`,
            );
          }
        })();
      }),
      catchError((err) => {
        void (async () => {
          try {
            await client.del(redisKey);
          } catch (delErr: any) {
            this.logger.warn(
              `Failed to release in-flight lock for "${redisKey}": ${delErr.message}`,
            );
          }
        })();
        return throwError(() => err);
      }),
    );
  }
}
