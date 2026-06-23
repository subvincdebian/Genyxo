import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { json, urlencoded } from "express";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(json({ limit: "50mb" }));
  app.use(urlencoded({ extended: true, limit: "50mb" }));
  app.enableCors({
    origin: "*",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    allowedHeaders: "Content-Type, Accept, Authorization",
  });
  await app.listen(process.env.PORT || 3000, "0.0.0.0");
  console.log(`Application is running on: ${await app.getUrl()}`);
}

if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  bootstrap();
}

// Vercel Serverless
let cachedServer: any;

export default async function handler(req: any, res: any) {
  if (!cachedServer) {
    const app = await NestFactory.create(AppModule);

    app.use(json({ limit: "50mb" }));
    app.use(urlencoded({ extended: true, limit: "50mb" }));
    app.enableCors({
      origin: "*",
      methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
      allowedHeaders: "Content-Type, Accept, Authorization",
    });
    await app.init();
    cachedServer = app.getHttpAdapter().getInstance();
  }
  return cachedServer(req, res);
}
