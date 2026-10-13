import { Global, Module } from "@nestjs/common";
import { CircuitBreakerService } from "./circuit-breaker.service";
import { MetricsModule } from "../../metrics/metrics.module";

@Global()
@Module({
  imports: [MetricsModule],
  providers: [CircuitBreakerService],
  exports: [CircuitBreakerService],
})
export class ResilienceModule {}
