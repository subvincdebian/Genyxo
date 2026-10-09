import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import * as Sentry from "@sentry/node";

@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(SentryExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Report unexpected server errors (5xx) to Sentry
    if (status >= 500 && process.env.SENTRY_DSN) {
      Sentry.withScope((scope) => {
        scope.setTag("path", request.url);
        scope.setTag("method", request.method);
        scope.setExtra("headers", request.headers);

        if (request.id) {
          scope.setTag("requestId", request.id);
        }

        if (request.user?.id) {
          scope.setUser({
            id: String(request.user.id),
            email: request.user.email,
          });
        }

        Sentry.captureException(exception);
      });
    }

    // Default JSON error formatting
    if (!response.sent) {
      const errorResponse =
        exception instanceof HttpException
          ? exception.getResponse()
          : {
              statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
              message: "Internal server error",
              timestamp: new Date().toISOString(),
            };

      if (typeof errorResponse === "object") {
        response.status(status).send({
          ...errorResponse,
          requestId: request.id,
        });
      } else {
        response.status(status).send({
          statusCode: status,
          message: errorResponse,
          requestId: request.id,
        });
      }
    }
  }
}
