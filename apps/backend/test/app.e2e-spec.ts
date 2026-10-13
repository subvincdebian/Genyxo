import { Test, TestingModule } from "@nestjs/testing";
import {
  NestFastifyApplication,
  FastifyAdapter,
} from "@nestjs/platform-fastify";
import { AppModule } from "../src/app.module";

describe("AppController (e2e)", () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    jest.setTimeout(30000);
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it("should be defined", () => {
    expect(app).toBeDefined();
  });
});
