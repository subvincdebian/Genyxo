import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Message } from "../chat/message.entity";
import { IntegrationAction } from "./integration-action.entity";
import { IntegrationClient } from "./integration-client.entity";
import { IntegrationConnection } from "./integration-connection.entity";
import { IntegrationToolsService } from "./integration-tools.service";
import { IntegrationsController } from "./integrations.controller";
import { IntegrationsService } from "./integrations.service";

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      IntegrationConnection,
      IntegrationAction,
      IntegrationClient,
      Message,
    ]),
  ],
  providers: [IntegrationsService, IntegrationToolsService],
  controllers: [IntegrationsController],
  exports: [IntegrationsService, IntegrationToolsService],
})
export class IntegrationsModule {}
