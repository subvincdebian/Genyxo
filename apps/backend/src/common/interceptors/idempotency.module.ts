import { Global, Module } from "@nestjs/common";
import { IdempotencyInterceptor } from "./idempotency.interceptor";

@Global()
@Module({
  providers: [IdempotencyInterceptor],
  exports: [IdempotencyInterceptor],
})
export class IdempotencyModule {}
