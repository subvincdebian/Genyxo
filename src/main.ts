process.env.UV_THREADPOOL_SIZE = process.env.UV_THREADPOOL_SIZE || "64";

import * as dns from "dns";
dns.setDefaultResultOrder("ipv4first");

import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import fastifyHelmet from "@fastify/helmet";
import fastifyCompress from "@fastify/compress";
import * as zlib from "zlib";
import { AppModule } from "./app.module";

function createFastifyAdapter(): FastifyAdapter {
  return new FastifyAdapter({
    bodyLimit: 10 * 1024 * 1024,
    trustProxy: true,
    keepAliveTimeout: 65000,
    forceCloseConnections: true,
    ignoreTrailingSlash: true,
  });
}

async function configureApp(app: NestFastifyApplication) {
  app.enableShutdownHooks();

  const httpServer = app.getHttpServer();
  if (httpServer) {
    httpServer.headersTimeout = 66000;
    httpServer.keepAliveTimeout = 65000;
    httpServer.requestTimeout = 65000;
    httpServer.on("connection", (socket: any) => {
      socket.setNoDelay(true);
    });
  }

  await app.register(fastifyHelmet as any, {
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  });

  await app.register(fastifyCompress as any, {
    encodings: ["brotli", "gzip"],
    threshold: 1024,
    brotliOptions: {
      params: {
        [zlib.constants.BROTLI_PARAM_QUALITY]: 4,
      },
    },
    zlibOptions: {
      level: 6,
    },
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      stopAtFirstError: true,
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
    maxAge: 86400,
  });
}

async function bootstrap() {
  const adapter = createFastifyAdapter();
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter,
  );

  await configureApp(app);

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  await app.listen(port, "0.0.0.0");
  Logger.log(
    `Application is running on: ${await app.getUrl()}`,
    "Bootstrap",
  );
}

if (!process.env.VERCEL) {
  bootstrap();
}

// Vercel Serverless
let cachedApp: NestFastifyApplication;

export default async function handler(req: any, res: any) {
  if (!cachedApp) {
    const adapter = createFastifyAdapter();
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
