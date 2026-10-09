import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { diag, DiagConsoleLogger, DiagLogLevel } from "@opentelemetry/api";

const isOtelEnabled =
  process.env.OTEL_ENABLED === "true" ||
  Boolean(process.env.OTEL_EXPORTER_OTLP_ENDPOINT);

let sdk: NodeSDK | null = null;

if (isOtelEnabled) {
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
