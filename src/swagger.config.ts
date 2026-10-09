import { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule, OpenAPIObject } from "@nestjs/swagger";

export function createSwaggerDocument(app: INestApplication): OpenAPIObject {
  const swaggerConfig = new DocumentBuilder()
    .setTitle("Genyxo Enterprise Platform API")
    .setDescription(
      "Production-ready API specification for Genyxo Generative AI Platform",
    )
    .setVersion("1.0.0")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Enter your JWT Bearer token",
      },
      "JWT-auth",
    )
    .addApiKey(
      {
        type: "apiKey",
        name: "Idempotency-Key",
        in: "header",
        description: "Optional UUID idempotency key for mutations",
      },
      "Idempotency-Key",
    )
    .addTag(
      "Auth",
      "Authentication, registration, social login & password management",
    )
    .addTag("Profile", "User profile, balance, subscription status & accounts")
    .addTag("Chat", "AI chat streaming, conversations & media generation")
    .addTag("Payment", "Payment gateways, top-ups & transaction lifecycle")
    .addTag("Notifications", "User notifications & announcements")
    .addTag("Support", "Support tickets & customer care")
    .addTag("Admin", "Administrative controls & manual credit allocation")
    .addTag("Audit", "Immutable audit trail & compliance logs")
    .addTag("Health", "Kubernetes liveness and readiness probes")
    .addTag("Metrics", "Prometheus metrics endpoint")
    .build();

  return SwaggerModule.createDocument(app, swaggerConfig);
}

export function setupSwagger(app: any) {
  const document = createSwaggerDocument(app);
  SwaggerModule.setup("docs", app, document, {
    useGlobalPrefix: false,
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: "alpha",
      operationsSorter: "alpha",
    },
  });
  return document;
}
