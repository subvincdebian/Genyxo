import { Injectable, LoggerService, Scope } from "@nestjs/common";
import pino, { Logger as PinoInstance } from "pino";

const isProduction = process.env.NODE_ENV === "production";

export const pinoConfig: pino.LoggerOptions = {
  level: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "password",
      "*.password",
      "token",
      "*.token",
      "apiKey",
      "*.apiKey",
      "secret",
      "*.secret",
      "creditCard",
      "*.creditCard",
    ],
    censor: "[REDACTED]",
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level(label) {
      return { level: label };
    },
  },
};

@Injectable({ scope: Scope.TRANSIENT })
export class AppLogger implements LoggerService {
  private readonly logger: PinoInstance;
  private context?: string;

  constructor() {
    this.logger = pino(pinoConfig);
  }

  setContext(context: string): void {
    this.context = context;
  }

  log(message: any, ...optionalParams: any[]): void {
    this.callLogger("info", message, optionalParams);
  }

  error(message: any, ...optionalParams: any[]): void {
    this.callLogger("error", message, optionalParams);
  }

  warn(message: any, ...optionalParams: any[]): void {
    this.callLogger("warn", message, optionalParams);
  }

  debug?(message: any, ...optionalParams: any[]): void {
    this.callLogger("debug", message, optionalParams);
  }

  verbose?(message: any, ...optionalParams: any[]): void {
    this.callLogger("trace", message, optionalParams);
  }

  private callLogger(
    level: "info" | "error" | "warn" | "debug" | "trace",
    message: any,
    params: any[],
  ): void {
    const context =
      params.length > 0 && typeof params[params.length - 1] === "string"
        ? params[params.length - 1]
        : this.context;

    if (typeof message === "object") {
      this.logger[level]({ context, ...message });
    } else {
      this.logger[level]({ context }, message);
    }
  }
}
