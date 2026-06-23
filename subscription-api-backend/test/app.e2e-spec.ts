import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { App } from "supertest/types";
import { AppModule } from "../src/app.module";
import { beforeEach, describe } from "node:test";

describe("AppController (e2e)", () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });
});
