import { Injectable, Logger, OnModuleInit, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { IntegrationToolsService } from "../../integrations/integration-tools.service";

export interface PageSnapshot {
  url: string;
  title: string;
  text: string;
  items: {
    ref: string;
    kind: string;
    label: string;
    value?: string;
    href?: string;
    options?: string[];
  }[];
}

/**
 * Client for the agent browser (apps/browser): one Chromium session per chat.
 * It also registers the browser with the plugin confirmations, so a click
 * the user confirmed on a card is carried out in the same session.
 */
@Injectable()
export class BrowserService implements OnModuleInit {
  private readonly logger = new Logger(BrowserService.name);

  constructor(
    private readonly config: ConfigService,
    @Optional() private readonly integrationTools?: IntegrationToolsService,
  ) {}

  onModuleInit() {
    this.integrationTools?.registerBuiltin(
      "browser",
      "Browser",
      async (userId, tool, args) => {
        if (tool !== "browser_click") throw new Error("Unknown browser action");
        return this.call(String(args.session), "click", {
          ref: args.ref,
          confirmed: true,
        });
      },
    );
  }

  private get url() {
    return (this.config.get<string>("BROWSER_URL") || "").replace(/\/$/, "");
  }

  get available() {
    return Boolean(this.url && this.config.get<string>("BROWSER_TOKEN"));
  }

  /** One browser session per user and chat. */
  sessionKey(userId: number, conversationId: number) {
    return `u${userId}-c${conversationId}`;
  }

  async call<T = any>(
    session: string,
    action: string,
    body: Record<string, unknown> = {},
  ): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${this.url}/session/${session}/${action}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.get<string>("BROWSER_TOKEN")}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60_000),
      });
    } catch (error) {
      this.logger.warn(
        `Agent browser unreachable: ${(error as Error).message}`,
      );
      throw new Error("The browser is not reachable right now");
    }
    const data = (await response.json().catch(() => ({}))) as T & {
      error?: string;
    };
    if (!response.ok)
      throw new Error(data.error || `The browser answered ${response.status}`);
    return data;
  }
}
