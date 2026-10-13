import { Test, TestingModule } from "@nestjs/testing";
import { AuthController } from "./auth.controller";

import { AuthService } from "./auth.service";

describe("AuthController", () => {
  let controller: AuthController;
  const auth = { verifyEmail: jest.fn(), login: jest.fn() };
  const originalFrontend = process.env.FRONTEND_URL;
  afterEach(() => {
    jest.clearAllMocks();
    if (originalFrontend === undefined) delete process.env.FRONTEND_URL;
    else process.env.FRONTEND_URL = originalFrontend;
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: auth }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
  it.each(["google", "facebook"])(
    "returns %s result to Next without issuing a second token",
    async (provider) => {
      process.env.FRONTEND_URL = "http://localhost:3001";
      const redirect = jest.fn();
      const req = {
        user: { access_token: "valid+token&value", user: { id: 7 } },
      };
      if (provider === "google")
        await controller.googleAuthRedirect(req, { redirect });
      else await controller.facebookLoginCallback(req, { redirect });
      const result = new URL(redirect.mock.calls[0][0]);
      expect(result.origin).toBe("http://localhost:3001");
      expect(result.searchParams.get("token")).toBe(req.user.access_token);
      expect(redirect.mock.calls[0][1]).toBe(302);
      expect(auth.login).not.toHaveBeenCalled();
    },
  );
  it("returns email verification to Next without claiming a successful payment", async () => {
    process.env.FRONTEND_URL = "http://localhost:3001";
    auth.verifyEmail.mockResolvedValue({ access_token: "verified" });
    const redirect = jest.fn();
    await controller.verify("verification-token", { redirect });
    expect(auth.verifyEmail).toHaveBeenCalledWith("verification-token");
    expect(redirect).toHaveBeenCalledWith(
      "http://localhost:3001/?token=verified",
      302,
    );
  });
});
