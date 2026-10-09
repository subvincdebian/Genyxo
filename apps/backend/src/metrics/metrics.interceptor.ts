import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { MetricsService } from "./metrics.service";

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== "http") {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest();
    const method = req.method || "GET";
    const route =
      req.routeOptions?.url ||
      req.routerPath ||
      req.url?.split("?")[0] ||
      "unknown";

    // Ignore polling metrics or health endpoint to prevent self-sampling distortion
    if (route === "/metrics" || route === "/health/liveness") {
      return next.handle();
    }

    const start = process.hrtime();

    return next.handle().pipe(
      tap({
        next: () => {
          const res = context.switchToHttp().getResponse();
          const statusCode = String(res.statusCode || 200);
          this.record(method, route, statusCode, start);
        },
        error: (err) => {
          const statusCode = String(err.status || err.statusCode || 500);
          this.record(method, route, statusCode, start);
        },
      }),
    );
  }

  private record(
    method: string,
    route: string,
    statusCode: string,
    start: [number, number],
  ): void {
    const [seconds, nanoseconds] = process.hrtime(start);
    const durationInSeconds = seconds + nanoseconds / 1e9;

    this.metricsService.httpRequestDuration.observe(
      { method, route, status_code: statusCode },
      durationInSeconds,
    );

    this.metricsService.httpRequestsTotal.inc({
      method,
      route,
      status_code: statusCode,
    });
  }
}
