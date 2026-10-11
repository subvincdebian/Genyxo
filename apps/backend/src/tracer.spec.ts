describe("optional OpenTelemetry bootstrap", () => {
  const originalEnv = process.env;
  const loadModule = jest.fn();

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.OTEL_ENABLED;
    delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    jest.clearAllMocks();
    loadModule.mockImplementation(() => {
      throw new Error("Disabled tracing must not load SDK packages");
    });
    for (const name of [
      "@opentelemetry/sdk-node",
      "@opentelemetry/auto-instrumentations-node",
      "@opentelemetry/exporter-trace-otlp-http",
      "@opentelemetry/api",
    ]) {
      jest.doMock(name, () => loadModule(name));
    }
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it.each([undefined, "false"])(
    "does not resolve SDK dependencies when OTEL_ENABLED=%s",
    (enabled) => {
      if (enabled) process.env.OTEL_ENABLED = enabled;
      jest.isolateModules(() => {
        const tracer =
          jest.requireActual<typeof import("./tracer")>("./tracer");
        expect(tracer.sdk).toBeNull();
      });
      expect(loadModule).not.toHaveBeenCalled();
    },
  );

  it.each(["flag", "endpoint"])(
    "initializes instrumentation synchronously when enabled by %s",
    (setting) => {
      if (setting === "flag") process.env.OTEL_ENABLED = "true";
      else
        process.env.OTEL_EXPORTER_OTLP_ENDPOINT =
          "https://otel.example.test/v1/traces";

      const sdk = { start: jest.fn(), shutdown: jest.fn() };
      const NodeSDK = jest.fn(() => sdk);
      const OTLPTraceExporter = jest.fn();
      const getNodeAutoInstrumentations = jest.fn(() => []);
      loadModule.mockImplementation((name: string) => {
        switch (name) {
          case "@opentelemetry/sdk-node":
            return { NodeSDK };
          case "@opentelemetry/auto-instrumentations-node":
            return { getNodeAutoInstrumentations };
          case "@opentelemetry/exporter-trace-otlp-http":
            return { OTLPTraceExporter };
          case "@opentelemetry/api":
            return {};
          default:
            throw new Error(`Unexpected module: ${name}`);
        }
      });
      jest.spyOn(process, "on").mockReturnValue(process);
      delete process.env.OTEL_DEBUG;

      jest.isolateModules(() => {
        const tracer =
          jest.requireActual<typeof import("./tracer")>("./tracer");
        expect(tracer.sdk).toBe(sdk);
        expect(sdk.start).toHaveBeenCalledTimes(1);
      });
      expect(NodeSDK).toHaveBeenCalledTimes(1);
      expect(OTLPTraceExporter).toHaveBeenCalledWith(
        expect.objectContaining({
          url:
            process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
            "http://localhost:4318/v1/traces",
        }),
      );
    },
  );
});
