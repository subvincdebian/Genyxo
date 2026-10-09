import { Injectable, Optional } from "@nestjs/common";
import {
  Registry,
  collectDefaultMetrics,
  Counter,
  Histogram,
  Gauge,
} from "prom-client";
import { DataSource } from "typeorm";
import { RedisService } from "@liaoliaots/nestjs-redis";

@Injectable()
export class MetricsService {
  private readonly registry: Registry;

  public readonly httpRequestsTotal: Counter<
    "method" | "route" | "status_code"
  >;
  public readonly httpRequestDuration: Histogram<
    "method" | "route" | "status_code"
  >;
  public readonly dbConnectionsActive: Gauge;
  public readonly dbConnectionsIdle: Gauge;
  public readonly redisStatus: Gauge;
  public readonly websocketActiveClients: Gauge;
  public readonly circuitBreakerState: Gauge<"name">;
  public readonly circuitBreakerCallsTotal: Counter<"name" | "status">;
  public readonly queueJobsWaiting: Gauge<"queue">;
  public readonly queueJobsActive: Gauge<"queue">;
  public readonly queueJobsFailed: Gauge<"queue">;

  constructor(
    @Optional() private readonly dataSource?: DataSource,
    @Optional() private readonly redisService?: RedisService,
  ) {
    this.registry = new Registry();

    // Collect default Node.js and OS metrics
    collectDefaultMetrics({
      register: this.registry,
      prefix: "genyxo_",
    });

    this.httpRequestsTotal = new Counter({
      name: "genyxo_http_requests_total",
      help: "Total number of HTTP requests",
      labelNames: ["method", "route", "status_code"],
      registers: [this.registry],
    });

    this.httpRequestDuration = new Histogram({
      name: "genyxo_http_request_duration_seconds",
      help: "HTTP request duration in seconds",
      labelNames: ["method", "route", "status_code"],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
    });

    this.dbConnectionsActive = new Gauge({
      name: "genyxo_db_connections_active",
      help: "Active database connections in the connection pool",
      registers: [this.registry],
    });

    this.dbConnectionsIdle = new Gauge({
      name: "genyxo_db_connections_idle",
      help: "Idle database connections in the connection pool",
      registers: [this.registry],
    });

    this.redisStatus = new Gauge({
      name: "genyxo_redis_status",
      help: "Redis connection status (1 = connected, 0 = disconnected)",
      registers: [this.registry],
    });

    this.websocketActiveClients = new Gauge({
      name: "genyxo_websocket_active_clients",
      help: "Current active WebSocket client connections",
      registers: [this.registry],
    });

    this.circuitBreakerState = new Gauge({
      name: "genyxo_circuit_breaker_state",
      help: "Circuit breaker state: 0 = CLOSED, 1 = OPEN, 2 = HALF_OPEN",
      labelNames: ["name"],
      registers: [this.registry],
    });

    this.circuitBreakerCallsTotal = new Counter({
      name: "genyxo_circuit_breaker_calls_total",
      help: "Total calls through circuit breaker by status",
      labelNames: ["name", "status"],
      registers: [this.registry],
    });

    this.queueJobsWaiting = new Gauge({
      name: "genyxo_queue_jobs_waiting",
      help: "Number of waiting jobs in BullMQ queue",
      labelNames: ["queue"],
      registers: [this.registry],
    });

    this.queueJobsActive = new Gauge({
      name: "genyxo_queue_jobs_active",
      help: "Number of active jobs in BullMQ queue",
      labelNames: ["queue"],
      registers: [this.registry],
    });

    this.queueJobsFailed = new Gauge({
      name: "genyxo_queue_jobs_failed",
      help: "Number of failed jobs in BullMQ queue",
      labelNames: ["queue"],
      registers: [this.registry],
    });
  }

  public async getMetrics(): Promise<string> {
    await this.updateDynamicMetrics();
    return this.registry.metrics();
  }

  public getContentType(): string {
    return this.registry.contentType;
  }

  private async updateDynamicMetrics(): Promise<void> {
    // Database connection pool stats
    if (this.dataSource && this.dataSource.isInitialized) {
      try {
        const driver = this.dataSource.driver as any;
        const pool = driver?.pool;
        if (pool) {
          const total = pool._allObjects?.length ?? 0;
          const free = pool._freeObjects?.length ?? 0;
          this.dbConnectionsActive.set(Math.max(0, total - free));
          this.dbConnectionsIdle.set(free);
        } else {
          this.dbConnectionsActive.set(1);
          this.dbConnectionsIdle.set(0);
        }
      } catch {
        this.dbConnectionsActive.set(0);
      }
    } else {
      this.dbConnectionsActive.set(0);
      this.dbConnectionsIdle.set(0);
    }

    // Redis connection status
    if (this.redisService) {
      try {
        const client = this.redisService.getOrThrow();
        const pong = await client.ping();
        this.redisStatus.set(pong === "PONG" ? 1 : 0);
      } catch {
        this.redisStatus.set(0);
      }
    } else {
      this.redisStatus.set(0);
    }
  }
}
