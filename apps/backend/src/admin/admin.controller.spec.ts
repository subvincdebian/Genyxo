import { Test } from "@nestjs/testing";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { PassportModule } from "@nestjs/passport";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { PaymentService } from "../payment/payment.service";
import { JwtStrategy } from "../auth/jwt.strategy";
import { UsersService } from "../users/users.service";
import { Role } from "../users/role.enum";
import { IdempotencyInterceptor } from "../common/interceptors/idempotency.interceptor";

describe("Admin API authorization after removing legacy HTML", () => {
  let app: NestFastifyApplication;
  const secret = "isolated-regression-test-secret";
  const jwt = new JwtService({ secret });
  const originalFrontend = process.env.FRONTEND_URL;
  beforeAll(async () => {
    process.env.FRONTEND_URL = "http://localhost:3001";
    const module = await Test.createTestingModule({
      imports: [PassportModule],
      controllers: [AdminController],
      providers: [
        JwtStrategy,
        { provide: ConfigService, useValue: { get: () => secret } },
        {
          provide: UsersService,
          useValue: {
            findAuthUserById: async (id: number) => ({
              id,
              email: "fixture@example.test",
              role: id === 1 ? Role.ADMIN : Role.USER,
            }),
          },
        },
        {
          provide: AdminService,
          useValue: { getAllUsers: () => ({ data: [], meta: { total: 0 } }) },
        },
        { provide: PaymentService, useValue: {} },
      ],
    })
      .overrideInterceptor(IdempotencyInterceptor)
      .useValue({ intercept: (_ctx: any, next: any) => next.handle() })
      .compile();
    app = module.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(async () => {
    await app?.close();
    if (originalFrontend === undefined) delete process.env.FRONTEND_URL;
    else process.env.FRONTEND_URL = originalFrontend;
  });
  it.each(["panel", "users"])(
    "rejects missing JWT for %s",
    async (endpoint) => {
      const response = await app.inject({
        method: "GET",
        url: "/are-you-sure-you-want-to-admin/" + endpoint,
      });
      expect(response.statusCode).toBe(401);
    },
  );
  it.each(["panel", "users"])(
    "rejects a non-admin even when the JWT claims admin for %s",
    async (endpoint) => {
      const token = jwt.sign({
        sub: 2,
        email: "fixture@example.test",
        role: Role.ADMIN,
      });
      const response = await app.inject({
        method: "GET",
        url: "/are-you-sure-you-want-to-admin/" + endpoint,
        headers: { authorization: "Bearer " + token },
      });
      expect(response.statusCode).toBe(403);
    },
  );
  it("redirects an authorized administrator to Next instead of reading deleted HTML", async () => {
    const token = jwt.sign({
      sub: 1,
      email: "fixture@example.test",
      role: Role.ADMIN,
    });
    const response = await app.inject({
      method: "GET",
      url: "/are-you-sure-you-want-to-admin/panel",
      headers: { authorization: "Bearer " + token },
    });
    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe("http://localhost:3001/admin");
  });
});
