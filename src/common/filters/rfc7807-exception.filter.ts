import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import * as Sentry from "@sentry/node";

export interface InvalidParam {
  field?: string;
  reason: string;
}

export interface Rfc7807ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  invalidParams?: InvalidParam[];
  correlationId?: string;
  timestamp: string;
  // Backward compatibility fields for legacy clients
  statusCode: number;
  message: string;
}

const HTTP_STATUS_TITLES: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: "Bad Request",
  [HttpStatus.UNAUTHORIZED]: "Unauthorized",
  [HttpStatus.PAYMENT_REQUIRED]: "Payment Required",
  [HttpStatus.FORBIDDEN]: "Forbidden",
  [HttpStatus.NOT_FOUND]: "Not Found",
  [HttpStatus.METHOD_NOT_ALLOWED]: "Method Not Allowed",
  [HttpStatus.CONFLICT]: "Conflict",
  [HttpStatus.GONE]: "Gone",
  [HttpStatus.UNPROCESSABLE_ENTITY]: "Unprocessable Entity",
  [HttpStatus.TOO_MANY_REQUESTS]: "Too Many Requests",
  [HttpStatus.INTERNAL_SERVER_ERROR]: "Internal Server Error",
  [HttpStatus.BAD_GATEWAY]: "Bad Gateway",
  [HttpStatus.SERVICE_UNAVAILABLE]: "Service Unavailable",
  [HttpStatus.GATEWAY_TIMEOUT]: "Gateway Timeout",
};

const ERROR_TYPE_BASE_URL = "https://api.genyxo.com/errors";

@Catch()
export class Rfc7807ExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(Rfc7807ExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    if (response.sent) {
      return;
    }

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const correlationId =
      request.id ||
      request.headers?.["x-correlation-id"] ||
      request.headers?.["x-request-id"] ||
      undefined;

    // Report unexpected server errors (5xx) to Sentry
    if (status >= 500 && process.env.SENTRY_DSN) {
      Sentry.withScope((scope) => {
        scope.setTag("path", request.url);
        scope.setTag("method", request.method);
        scope.setExtra("headers", request.headers);

        if (correlationId) {
          scope.setTag("correlationId", correlationId);
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

    const title =
      HTTP_STATUS_TITLES[status] ||
      (status >= 500 ? "Internal Server Error" : "Error");

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const typeUri = `${ERROR_TYPE_BASE_URL}/${slug}`;

    let detail = "An unexpected error occurred.";
    let invalidParams: InvalidParam[] | undefined;

    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      if (typeof res === "string") {
        detail = res;
      } else if (typeof res === "object" && res !== null) {
        const resObj = res as Record<string, any>;
        if (Array.isArray(resObj.message)) {
          detail = "Validation failed for one or more fields.";
          invalidParams = resObj.message.map((msg: string) => {
            const firstWord = msg.split(" ")[0];
            return {
              field: firstWord,
              reason: msg,
            };
          });
        } else if (typeof resObj.message === "string") {
          detail = resObj.message;
        } else if (typeof resObj.error === "string") {
          detail = resObj.error;
        }
      }
    } else if (exception instanceof Error) {
      const isProduction =
        process.env.NODE_ENV === "production" || !!process.env.VERCEL;
      detail = isProduction
        ? "An internal server error occurred."
        : exception.message;
    }

    const problemDetails: Rfc7807ProblemDetails = {
      type: typeUri,
      title,
      status,
      detail,
      instance: request.url,
      timestamp: new Date().toISOString(),
      statusCode: status,
      message: detail,
    };

    if (correlationId) {
      problemDetails.correlationId = correlationId;
    }

    if (invalidParams && invalidParams.length > 0) {
      problemDetails.invalidParams = invalidParams;
    }

    if (status >= 500) {
      this.logger.error(
        `[${request.method}] ${request.url} - ${status} ${title}: ${detail}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(
        `[${request.method}] ${request.url} - ${status} ${title}: ${detail}`,
      );
    }

    response
      .status(status)
      .header("Content-Type", "application/problem+json")
      .send(problemDetails);
  }
}
