process.env.OPENAPI_GENERATE = "true";
process.env.NODE_ENV = "test";

import { Test } from "@nestjs/testing";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { AuthController } from "../src/auth/auth.controller";
import { ProfileController } from "../src/profile/profile.controller";
import { ChatController } from "../src/chat/chat.controller";
import { PaymentController } from "../src/payment/payment.controller";
import { NotificationsController } from "../src/notifications/notifications.controller";
import { AdminController } from "../src/admin/admin.controller";
import { SupportController } from "../src/support/support.controller";
import { HealthController } from "../src/health/health.controller";
import { MetricsController } from "../src/metrics/metrics.controller";
import { AuditController } from "../src/audit/audit.controller";
import { createSwaggerDocument } from "../src/swagger.config";
import * as fs from "fs";
import * as path from "path";

async function generateOpenApi() {
  const moduleRef = await Test.createTestingModule({
    controllers: [
      AuthController,
      ProfileController,
      ChatController,
      PaymentController,
      NotificationsController,
      AdminController,
      SupportController,
      HealthController,
      MetricsController,
      AuditController,
    ],
  })
    .useMocker(() => ({}))
    .compile();

  const app = moduleRef.createNestApplication<NestFastifyApplication>(
    new FastifyAdapter(),
  );

  const document = createSwaggerDocument(app);

  const distDir = path.resolve(__dirname, "../dist");
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  const outputPath = path.join(distDir, "openapi.json");
  fs.writeFileSync(outputPath, JSON.stringify(document, null, 2), "utf8");

  const frontendTypesDir = path.resolve(__dirname, "../frontend/types");
  if (!fs.existsSync(frontendTypesDir)) {
    fs.mkdirSync(frontendTypesDir, { recursive: true });
  }
  const frontendJsonPath = path.join(frontendTypesDir, "openapi.json");
  fs.writeFileSync(frontendJsonPath, JSON.stringify(document, null, 2), "utf8");

  console.log(
    `[OpenAPI] Successfully generated OpenAPI specification at ${outputPath}`,
  );

  await app.close();
  process.exit(0);
}

generateOpenApi().catch((err) => {
  console.error("[OpenAPI] Failed to generate specification:", err);
  process.exit(1);
});
