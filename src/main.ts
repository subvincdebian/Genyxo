import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import fastifyHelmet from "@fastify/helmet";
import fastifyCompress from "@fastify/compress";
import { AppModule } from "./app.module";

async function configureApp(app: NestFastifyApplication) {
  await app.register(fastifyHelmet as any, {
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  });

  await app.register(fastifyCompress as any, {
    encodings: ["brotli", "gzip"],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
    : ["https://genyxo.com", "http://localhost:3000"];

  app.enableCors({
    origin: allowedOrigins.includes("*") ? true : allowedOrigins,
    credentials: true,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
    allowedHeaders: ["Content-Type", "Accept", "Authorization"],
  });
}

async function bootstrap() {
  const adapter = new FastifyAdapter({
    bodyLimit: 10 * 1024 * 1024,
    trustProxy: true,
  });

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter,
  );

  await configureApp(app);

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  await app.listen(port, "0.0.0.0");
  console.log(`Application is running on: ${await app.getUrl()}`);
}

if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  bootstrap();
}

// Vercel Serverless
let cachedApp: NestFastifyApplication;

export default async function handler(req: any, res: any) {
  if (!cachedApp) {
    const adapter = new FastifyAdapter({
      bodyLimit: 10 * 1024 * 1024,
      trustProxy: true,
    });
    cachedApp = await NestFactory.create<NestFastifyApplication>(
      AppModule,
      adapter,
    );
    await configureApp(cachedApp);
    await cachedApp.init();
    await cachedApp.getHttpAdapter().getInstance().ready();
  }
  const fastifyInstance = cachedApp.getHttpAdapter().getInstance();
  fastifyInstance.server.emit("request", req, res);
}
