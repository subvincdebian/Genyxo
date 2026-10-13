import {
  Injectable,
  Logger,
  OnApplicationShutdown,
  Optional,
  ServiceUnavailableException,
} from "@nestjs/common";
import CircuitBreaker from "opossum";
import { MetricsService } from "../../metrics/metrics.service";
import {
  CircuitBreakerOptions,
  DEFAULT_CIRCUIT_BREAKER_OPTIONS,
} from "./circuit-breaker.constants";

export interface CircuitBreakerStatus {
  name: string;
  state: "CLOSED" | "OPEN" | "HALF_OPEN";
  stats: {
    failures: number;
    fallbacks: number;
    successes: number;
    rejects: number;
    fires: number;
    timeouts: number;
    cacheHits: number;
    cacheMisses: number;
  };
}

@Injectable()
export class CircuitBreakerService implements OnApplicationShutdown {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly breakers = new Map<string, CircuitBreaker>();

  constructor(@Optional() private readonly metricsService?: MetricsService) {}

  public onApplicationShutdown(): void {
    this.shutdown();
  }

  public shutdown(): void {
    for (const [name, breaker] of this.breakers) {
      try {
        breaker.shutdown();
      } catch (err: any) {
        this.logger.error(
          `Error shutting down circuit breaker ${name}: ${err.message}`,
        );
      }
    }
    this.breakers.clear();
  }

  public getBreaker(
    name: string,
    customOptions?: CircuitBreakerOptions,
  ): CircuitBreaker {
    let breaker = this.breakers.get(name);
    if (breaker) {
      return breaker;
    }

    const defaultOpts = DEFAULT_CIRCUIT_BREAKER_OPTIONS[name] || {
      timeout: 30000,
      errorThresholdPercentage: 50,
      resetTimeout: 30000,
      volumeThreshold: 5,
    };

    const mergedOptions: CircuitBreaker.Options = {
      ...defaultOpts,
      ...customOptions,
      name,
    };

    // Generic executor function that executes the passed async action
    const actionExecutor = async <T>(
      action: (...args: any[]) => Promise<T>,
      ...args: any[]
    ): Promise<T> => {
      return action(...args);
    };

    breaker = new CircuitBreaker(actionExecutor, mergedOptions);
    this.registerEventHandlers(name, breaker);
    this.breakers.set(name, breaker);

    // Initial state metric: 0 = CLOSED
    this.metricsService?.circuitBreakerState.set({ name }, 0);

    return breaker;
  }

  public async execute<T>(
    name: string,
    action: () => Promise<T>,
    fallback?: (err: Error) => Promise<T> | T,
    customOptions?: CircuitBreakerOptions,
  ): Promise<T> {
    const breaker = this.getBreaker(name, customOptions);

    if (fallback) {
      breaker.fallback(fallback);
    }

    try {
      return (await breaker.fire(action)) as T;
    } catch (error: any) {
      if (error?.code === "EOPENBREAKER") {
        this.logger.warn(
          `Circuit breaker [${name}] rejected execution (Circuit is OPEN).`,
        );
        throw new ServiceUnavailableException(
          `Upstream service [${name}] is temporarily unavailable. Please retry later.`,
        );
      }
      if (error?.code === "ETIMEDOUT") {
        this.logger.warn(`Circuit breaker [${name}] execution timed out.`);
        throw new ServiceUnavailableException(
          `Upstream service [${name}] timed out.`,
        );
      }
      throw error;
    }
  }

  public getStatus(name: string): CircuitBreakerStatus | null {
    const breaker = this.breakers.get(name);
    if (!breaker) return null;

    let state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";
    if (breaker.opened) {
      state = "OPEN";
    } else if (breaker.halfOpen) {
      state = "HALF_OPEN";
    }

    return {
      name,
      state,
      stats: breaker.stats,
    };
  }

  public getAllStatuses(): CircuitBreakerStatus[] {
    const statuses: CircuitBreakerStatus[] = [];
    for (const [name] of this.breakers) {
      const status = this.getStatus(name);
      if (status) statuses.push(status);
    }
    return statuses;
  }

  private registerEventHandlers(name: string, breaker: CircuitBreaker): void {
    breaker.on("open", () => {
      this.logger.warn(`Circuit breaker [${name}] OPENED! Failing fast.`);
      this.metricsService?.circuitBreakerState.set({ name }, 1);
    });

    breaker.on("close", () => {
      this.logger.log(`Circuit breaker [${name}] CLOSED. Service restored.`);
      this.metricsService?.circuitBreakerState.set({ name }, 0);
    });

    breaker.on("halfOpen", () => {
      this.logger.log(
        `Circuit breaker [${name}] HALF-OPEN. Probing upstream service.`,
      );
      this.metricsService?.circuitBreakerState.set({ name }, 2);
    });

    breaker.on("success", () => {
      this.metricsService?.circuitBreakerCallsTotal.inc({
        name,
        status: "success",
      });
    });

    breaker.on("failure", (err: Error) => {
      this.logger.warn(
        `Circuit breaker [${name}] call failed: ${err?.message || "Unknown error"}`,
      );
      this.metricsService?.circuitBreakerCallsTotal.inc({
        name,
        status: "failure",
      });
    });

    breaker.on("timeout", () => {
      this.logger.warn(`Circuit breaker [${name}] call timed out.`);
      this.metricsService?.circuitBreakerCallsTotal.inc({
        name,
        status: "timeout",
      });
    });

    breaker.on("reject", () => {
      this.metricsService?.circuitBreakerCallsTotal.inc({
        name,
        status: "rejected",
      });
    });

    breaker.on("fallback", () => {
      this.metricsService?.circuitBreakerCallsTotal.inc({
        name,
        status: "fallback",
      });
    });
  }
}
