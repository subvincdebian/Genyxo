import type { NodeSDK } from "@opentelemetry/sdk-node";

const isOtelEnabled =
  process.env.OTEL_ENABLED === "true" ||
  Boolean(process.env.OTEL_EXPORTER_OTLP_ENDPOINT);

let sdk: NodeSDK | null = null;

if (isOtelEnabled) {
  // Load instrumentation synchronously before Nest, and only when configured.
  /* eslint-disable @typescript-eslint/no-require-imports -- Synchronous loads preserve instrumentation order and Vercel dependency tracing. */
  const {
    NodeSDK,
  }: typeof import("@opentelemetry/sdk-node") = require("@opentelemetry/sdk-node");
  const {
    getNodeAutoInstrumentations,
  }: typeof import("@opentelemetry/auto-instrumentations-node") = require("@opentelemetry/auto-instrumentations-node");
  const {
    OTLPTraceExporter,
  }: typeof import("@opentelemetry/exporter-trace-otlp-http") = require("@opentelemetry/exporter-trace-otlp-http");
  const {
    diag,
    DiagConsoleLogger,
    DiagLogLevel,
  }: typeof import("@opentelemetry/api") = require("@opentelemetry/api");
  /* eslint-enable @typescript-eslint/no-require-imports */

  if (process.env.OTEL_DEBUG === "true") {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);
  }

  const exporter = new OTLPTraceExporter({
    url:
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
      "http://localhost:4318/v1/traces",
    headers: process.env.OTEL_EXPORTER_OTLP_HEADERS
      ? (JSON.parse(process.env.OTEL_EXPORTER_OTLP_HEADERS) as Record<
          string,
          string
        >)
      : {},
  });

  sdk = new NodeSDK({
    traceExporter: exporter,
    serviceName: process.env.OTEL_SERVICE_NAME || "genyxo-backend",
    instrumentations: [
      getNodeAutoInstrumentations({
        "@opentelemetry/instrumentation-fs": { enabled: false },
      }),
    ],
  });

  sdk.start();

  process.on("SIGTERM", () => {
    sdk
      ?.shutdown()
      .then(() => console.log("[OpenTelemetry] Tracing terminated gracefully"))
      .catch((err) =>
        console.error("[OpenTelemetry] Error terminating tracing", err),
      );
  });
}

export { sdk };
