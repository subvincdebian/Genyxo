import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface SandboxFile {
  name: string;
  mime: string;
  size: number;
  data: string;
}

export interface SandboxResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  error: string | null;
  seconds: number;
  inputs: string[];
  files: SandboxFile[];
}

/** Client for the isolated Python sandbox service (apps/sandbox). */
@Injectable()
export class SandboxService {
  private readonly logger = new Logger(SandboxService.name);

  constructor(private readonly config: ConfigService) {}

  private get url() {
    return (this.config.get<string>("SANDBOX_URL") || "").replace(/\/$/, "");
  }

  private get token() {
    return this.config.get<string>("SANDBOX_TOKEN") || "";
  }

  /** True when a sandbox is configured, so models are offered the tool. */
  get available() {
    return Boolean(this.url && this.token);
  }

  async run(
    code: string,
    files: { name: string; data: string }[] = [],
    timeout = 60,
  ): Promise<SandboxResult> {
    if (!this.available) throw new Error("The code sandbox is not configured");
    let response: Response;
    try {
      response = await fetch(`${this.url}/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({ code, files, timeout }),
        signal: AbortSignal.timeout((timeout + 30) * 1000),
      });
    } catch (error) {
      this.logger.warn(`Sandbox unreachable: ${(error as Error).message}`);
      throw new Error("The code sandbox is not reachable right now");
    }
    const body = (await response
      .json()
      .catch(() => ({}))) as Partial<SandboxResult> & {
      error?: string;
    };
    if (!response.ok)
      throw new Error(
        body.error || `The code sandbox answered ${response.status}`,
      );
    return {
      ok: Boolean(body.ok),
      stdout: body.stdout || "",
      stderr: body.stderr || "",
      error: body.error ?? null,
      seconds: Number(body.seconds) || 0,
      inputs: body.inputs || [],
      files: body.files || [],
    };
  }
}
