import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule } from "@nestjs/config";
import { Message } from "./message.entity";
import { Conversation } from "./conversation.entity";
import { UsersModule } from "../users/users.module";
import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";
import { FalService } from "./fal.service";
import { PricingService } from "./pricing.service";
import { ChatProject } from "./project.entity";
import { ChatLibraryItem } from "./library-item.entity";
import { WorkspaceRecord } from "./workspace/workspace-record.entity";
import { WorkspaceService } from "./workspace/workspace.service";
import { WorkspaceController } from "./workspace/workspace.controller";

import { VoiceController } from "./voice/voice.controller";
import { VoiceService } from "./voice/voice.service";
import { LiveVoiceService } from "./voice/live.service";
import { LanguageProfileService } from "./language/language-profile.service";
import { IntegrationsModule } from "../integrations/integrations.module";
import { GeneratedMedia } from "./media/generated-media.entity";
import { MediaService } from "./media/media.service";
import { MediaController } from "./media/media.controller";
import { MapsService } from "./maps/maps.service";
import { WebSearchService } from "./web/web-search.service";
import { MapsController } from "./maps/maps.controller";
import { ScheduledService } from "./scheduled/scheduled.service";
import { ShareService } from "./share/share.service";
import { ShareController } from "./share/share.controller";
@Module({
  imports: [
    ConfigModule,
    UsersModule,
    IntegrationsModule,
    TypeOrmModule.forFeature([
      Message,
      Conversation,
      ChatProject,
      ChatLibraryItem,
      WorkspaceRecord,
      GeneratedMedia,
    ]),
  ],
  providers: [
    ChatService,
    MediaService,
    MapsService,
    WebSearchService,
    FalService,
    PricingService,
    WorkspaceService,
    VoiceService,
    LanguageProfileService,
    LiveVoiceService,
    ScheduledService,
    ShareService,
  ],
  controllers: [
    WorkspaceController,
    MediaController,
    MapsController,
    ChatController,
    VoiceController,
    ShareController,
  ],
  exports: [ChatService],
})
export class ChatModule {}
