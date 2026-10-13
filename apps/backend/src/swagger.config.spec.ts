import { Logger } from "@nestjs/common";
import { SwaggerModule } from "@nestjs/swagger";
import { setupSwagger } from "./swagger.config";

describe("Swagger runtime plugin availability", () => {
  const loadPlugin = jest.fn();
  const setup = jest.fn();
  const warn = jest.fn();

  beforeEach(() => {
    jest.doMock("@fastify/static", () => loadPlugin());
    jest.spyOn(SwaggerModule, "createDocument").mockReturnValue({
      openapi: "3.0.0",
      info: { title: "Test", version: "1" },
      paths: {},
    });
    jest.spyOn(SwaggerModule, "setup").mockImplementation(setup);
    jest.spyOn(Logger, "warn").mockImplementation(warn);
    setup.mockReset();
    warn.mockReset();
    loadPlugin.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
  });

  it("loads the plugin before enabling its static UI", () => {
    loadPlugin.mockReturnValue(() => undefined);
    setupSwagger({});
    expect(loadPlugin).toHaveBeenCalledTimes(1);
    expect(setup).toHaveBeenCalledWith(
      "docs",
      {},
      expect.any(Object),
      expect.objectContaining({ ui: true, swaggerUiEnabled: true }),
    );
  });

  it("keeps raw documentation available when a resolvable plugin cannot load", () => {
    loadPlugin.mockImplementation(() => {
      throw new Error("Missing runtime dependency");
    });
    expect(() => setupSwagger({})).not.toThrow();
    expect(setup).toHaveBeenCalledWith(
      "docs",
      {},
      expect.any(Object),
      expect.objectContaining({ ui: false, swaggerUiEnabled: false }),
    );
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
