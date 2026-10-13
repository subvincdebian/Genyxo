import { Test } from "@nestjs/testing";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { PassportModule } from "@nestjs/passport";
import { ConfigService } from "@nestjs/config";
import { AuthController } from "../auth.controller";
import { AuthService } from "../auth.service";
import { GoogleStrategy } from "../strategies/google.strategy";
import { FacebookStrategy } from "../strategies/facebook.strategy";

describe("OAuth redirects with the actual Fastify adapter and Passport strategies", () => {
  let app: NestFastifyApplication;
  beforeAll(async () => {
    const values: Record<string, string> = {
      GOOGLE_CLIENT_ID: "isolated-google-client",
      GOOGLE_CLIENT_SECRET: "isolated-google-secret",
      GOOGLE_CALLBACK_URL: "http://localhost:3001/auth/google/callback",
      FACEBOOK_APP_ID: "isolated-facebook-client",
      FACEBOOK_APP_SECRET: "isolated-facebook-secret",
      FACEBOOK_CALLBACK_URL: "http://localhost:3001/auth/facebook/callback",
    };
    const module = await Test.createTestingModule({
      imports: [PassportModule],
      controllers: [AuthController],
      providers: [
        GoogleStrategy,
        FacebookStrategy,
        { provide: AuthService, useValue: { validateOAuthLogin: jest.fn() } },
        {
          provide: ConfigService,
          useValue: { get: (key: string) => values[key] },
        },
      ],
    }).compile();
    app = module.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
      { logger: false },
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(async () => {
    await app?.close();
  });
  it.each(["google", "facebook"])(
    "starts %s login with a real HTTP 302, preserving its callback and scopes",
    async (provider) => {
      const response = await app.inject({
        method: "GET",
        url: `/auth/${provider}`,
      });
      expect(response.statusCode).toBe(302);
      const target = new URL(String(response.headers.location));
      expect(target.hostname).toMatch(
        provider === "google" ? /accounts\.google\.com$/ : /facebook\.com$/,
      );
      expect(target.searchParams.get("redirect_uri")).toBe(
        `http://localhost:3001/auth/${provider}/callback`,
      );
      expect(target.searchParams.get("scope")).toContain("email");
    },
  );
  it.each(["google", "facebook"])(
    "denies %s callback without a provider code",
    async (provider) => {
      const response = await app.inject({
        method: "GET",
        url: `/auth/${provider}/callback?error=access_denied`,
      });
      expect(response.statusCode).toBe(401);
      expect(response.headers.location).toBeUndefined();
    },
  );
});
