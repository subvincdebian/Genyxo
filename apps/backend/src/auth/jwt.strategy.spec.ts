import { ConfigService } from "@nestjs/config";
import { JwtStrategy } from "./jwt.strategy";
import { UsersService } from "../users/users.service";

describe("persistent account session revocation", () => {
  let version = 0;
  const users = {
    findAuthUserById: async (id: number) => ({
      id,
      email: "account@example.test",
      role: "user",
    }),
    getSessionVersion: async () => version,
  };
  const strategy = new JwtStrategy(
    new ConfigService({ JWT_SECRET: "test-only-secret" }),
    users as unknown as UsersService,
  );
  beforeEach(() => {
    version = 0;
  });
  it("accepts existing tokens until the account revokes them", async () => {
    const payload = { sub: 1, email: "account@example.test", role: "user" };
    await expect(strategy.validate(payload)).resolves.toMatchObject({ id: 1 });
    version++;
    await expect(strategy.validate(payload)).rejects.toThrow("Session expired");
    await expect(
      strategy.validate({ ...payload, sessionVersion: 1 }),
    ).resolves.toMatchObject({ id: 1 });
  });
  it("checks revocation on each request instead of using cached account data", async () => {
    const payload = {
      sub: 1,
      email: "account@example.test",
      role: "user",
      sessionVersion: 0,
    };
    await strategy.validate(payload);
    version = 3;
    await expect(strategy.validate(payload)).rejects.toThrow("Session expired");
  });
  it("checks individual token revocation before authorizing a request", async () => {
    const trackSession = jest.fn().mockResolvedValue("session-hash");
    const guarded = new JwtStrategy(
      new ConfigService({ JWT_SECRET: "test-only-secret" }),
      { ...users, trackSession } as unknown as UsersService,
    );
    const payload = {
      sub: 1,
      email: "account@example.test",
      role: "user",
      sessionVersion: 0,
      iat: 1,
      exp: 9999999999,
    };
    const request = {
      headers: { authorization: "Bearer test-token", "user-agent": "Firefox" },
      ip: "127.0.0.1",
    };
    await expect(guarded.validate(request, payload)).resolves.toMatchObject({
      id: 1,
      sessionId: "session-hash",
    });
    expect(trackSession).toHaveBeenCalledWith(
      1,
      "test-token",
      payload,
      "Firefox",
      "127.0.0.1",
    );
    trackSession.mockResolvedValueOnce(null);
    await expect(guarded.validate(request, payload)).rejects.toThrow(
      "Session revoked",
    );
  });
});
