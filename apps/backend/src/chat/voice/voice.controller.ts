import {
  Body,
  Controller,
  HttpCode,
  Post,
  Request,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Throttle } from "@nestjs/throttler";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  LiveSessionDto,
  SpeakVoiceDto,
  TranscribeVoiceDto,
  VoiceTurnDto,
} from "./voice.dto";
import { LiveVoiceService } from "./live.service";
import { VoiceService } from "./voice.service";
import {
  LanguageProfileService,
  countryFromHeaders,
} from "../language/language-profile.service";
import { ChatService } from "../chat.service";

@ApiTags("Chat voice")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"))
@Controller("chat/voice")
export class VoiceController {
  constructor(
    private readonly voice: VoiceService,
    private readonly languages: LanguageProfileService,
    private readonly live: LiveVoiceService,
    private readonly chat: ChatService,
  ) {}

  @ApiOperation({ summary: "Transcribe speech and detect its language" })
  @Throttle({ default: { limit: 40, ttl: 60000 } })
  @HttpCode(200)
  @Post("transcribe")
  async transcribe(@Body() body: TranscribeVoiceDto, @Request() req) {
    const likely = await this.languages.preferredLanguages(req.user.id, {
      country: countryFromHeaders(req.headers || {}),
      locales: body.locales,
    });
    return this.voice.transcribe(body.audio, body.mimeType, {
      sessionLanguage: body.sessionLanguage,
      likely,
    });
  }

  @ApiOperation({ summary: "Synthesize speech for a reply sentence" })
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  @HttpCode(200)
  @Post("speak")
  speak(@Body() body: SpeakVoiceDto) {
    return this.voice.speak(body.text, body.language, body.voice);
  }

  @ApiOperation({
    summary: "Start a Gemini Live voice call (single-use token)",
  })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @HttpCode(200)
  @Post("live")
  liveSession(@Body() body: LiveSessionDto, @Request() req) {
    return this.live.createSession(req.user.id, {
      voice: body.voice,
      conversationId: body.conversationId,
      locales: body.locales,
      country: countryFromHeaders(req.headers || {}),
    });
  }

  @ApiOperation({
    summary: "Save one spoken exchange of a live call to the chat",
  })
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @HttpCode(200)
  @Post("turn")
  saveTurn(@Body() body: VoiceTurnDto, @Request() req) {
    return this.chat.saveVoiceTurn(req.user.id, {
      conversationId: body.conversationId,
      projectId: body.projectId,
      user: body.user,
      assistant: body.assistant,
      model: `google/${this.live.model}`,
    });
  }
}
