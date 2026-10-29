import {
  ConflictException,
  GoneException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { randomUUID } from "crypto";
import { In, Repository } from "typeorm";
import { Message } from "../chat/message.entity";
import { actionFence, ActionCard, updateActionFence } from "./action-fence";
import { findPlugin, PluginDefinition } from "./catalog";
import { IntegrationAction } from "./integration-action.entity";
import { ActionPolicy, IntegrationsService } from "./integrations.service";
import {
  McpAuthError,
  mcpCallTool,
  mcpResultForModel,
  McpTool,
} from "./mcp/mcp-client";
import { geminiSchema, openAiSchema, reviveArgs } from "./mcp/tool-schema";
import {
  ActionPreview,
  ALL_TOOLS,
  IntegrationTool,
  ProviderError,
  rawCallPreview,
  rawCallWrites,
  ToolContext,
  ToolInputError,
} from "./tools";

const RESULT_LIMIT = 12_000;
const ACTION_TTL_MS = 24 * 60 * 60_000;
/** Above this many tools, large MCP plugins switch to find/run meta tools. */
const DIRECT_TOOL_LIMIT = 110;

/** A tool as offered to a chat model, whatever its source. */
export interface ChatTool {
  name: string;
  /** Stable key stored with proposed actions so Confirm can find it again. */
  key: string;
  pluginId: string;
  label: string;
  description: string;
  gemini?: Record<string, unknown>;
  openai: Record<string, unknown>;
  writes: (args: Record<string, any>) => boolean;
  risk: "low" | "high";
  preview: (args: Record<string, any>) => ActionPreview;
  run: (ctx: ToolContext, args: Record<string, any>) => Promise<unknown>;
}
export interface ChatToolset {
  tools: ChatTool[];
  plugins: PluginDefinition[];
  policies: Record<string, ActionPolicy>;
}
export interface ToolCallOutcome {
  /** Sent back to the model as the function result. */
  output: Record<string, unknown>;
  /** Markdown appended to the reply: a confirmation card for write actions. */
  card?: string;
  actionId?: string;
}

const EMPTY_SCHEMA = { type: "object", properties: {} };

function compact(value: unknown): unknown {
  const json = JSON.stringify(value ?? null);
  return json.length <= RESULT_LIMIT
    ? value
    : { truncated: true, partial: json.slice(0, RESULT_LIMIT) };
}
function resultLink(value: any): string | undefined {
  const url =
    value?.url || value?.edit || value?.view || value?.join || value?.data?.url;
  return typeof url === "string" && /^https:\/\//.test(url) ? url : undefined;
}
const humanize = (name: string) => {
  const words = name
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim()
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};
const prefixOf = (pluginId: string) => pluginId.replace(/[^a-z0-9]/gi, "_");
const toolName = (pluginId: string, name: string) =>
  `${prefixOf(pluginId)}__${name.replace(/[^a-zA-Z0-9_]/g, "_")}`.slice(0, 64);

/** Shows MCP arguments on a confirmation card: short values as rows, long text as the body. */
function mcpPreview(title: string, args: Record<string, any>): ActionPreview {
  const fields: { label: string; value: string }[] = [];
  let body: string | undefined;
  for (const [key, value] of Object.entries(args)) {
    const text = typeof value === "string" ? value : JSON.stringify(value);
    if (text === undefined) continue;
    if (text.length > 140 && (!body || text.length > body.length)) {
      if (body)
        fields.push({ label: humanize(key), value: `${body.slice(0, 120)}…` });
      body = text;
    } else if (fields.length < 10)
      fields.push({ label: humanize(key), value: text.slice(0, 300) });
  }
  return { title, fields, body };
}

function fromRest(tool: IntegrationTool, plugin: PluginDefinition): ChatTool {
  const raw =
    tool.name.endsWith("_api_request") || tool.name.endsWith("_graphql");
  const params =
    tool.parameters && Object.keys(tool.parameters.properties || {}).length
      ? (tool.parameters as unknown as Record<string, unknown>)
      : undefined;
  return {
    name: tool.name,
    key: tool.name,
    pluginId: tool.pluginId,
    label: tool.label,
    description: tool.description,
    gemini: params,
    openai: params || EMPTY_SCHEMA,
    writes: raw
      ? (args) => rawCallWrites(tool, args)
      : () => Boolean(tool.write),
    risk: tool.risk || "high",
    preview: raw
      ? (args) => rawCallPreview(plugin.name, tool, args)
      : (args) =>
          tool.preview ? tool.preview(args) : { title: tool.label, fields: [] },
    run: tool.run,
  };
}

function fromMcp(
  tool: McpTool,
  plugin: PluginDefinition,
  url: string,
): ChatTool {
  const title = tool.title || tool.annotations?.title || humanize(tool.name);
  const readOnly = tool.annotations?.readOnlyHint === true;
  const gemini = geminiSchema(tool.inputSchema || EMPTY_SCHEMA);
  return {
    name: toolName(plugin.id, tool.name),
    key: `mcp:${plugin.id}:${tool.name}`,
    pluginId: plugin.id,
    label: title,
    description: (tool.description || title).slice(0, 1500),
    gemini: Object.keys((gemini.properties as object) || {}).length
      ? gemini
      : undefined,
    openai: openAiSchema(tool.inputSchema),
    writes: () => !readOnly,
    // MCP treats a tool as destructive unless it says otherwise.
    risk: tool.annotations?.destructiveHint === false ? "low" : "high",
    preview: (args) => mcpPreview(`${plugin.name}: ${title}`, args),
    run: async (ctx, args) => {
      const result = mcpResultForModel(
        await mcpCallTool(
          url,
          ctx.token,
          tool.name,
          reviveArgs(args, tool.inputSchema),
        ),
      );
      if ("error" in result) throw new Error(String(result.error));
      return result;
    },
  };
}

@Injectable()
export class IntegrationToolsService {
  private readonly logger = new Logger(IntegrationToolsService.name);

  constructor(
    private readonly integrations: IntegrationsService,
    @InjectRepository(IntegrationAction)
    private readonly actions: Repository<IntegrationAction>,
    @Optional()
    @InjectRepository(Message)
    private readonly messages?: Repository<Message>,
  ) {}

  private async mcpToolsFor(userId: number, plugin: PluginDefinition) {
    if (plugin.auth.type !== "mcp") return [];
    const url = plugin.auth.url;
    return (await this.integrations.mcpTools(userId, plugin.id)).map((tool) =>
      fromMcp(tool, plugin, url),
    );
  }

  /** Find/run pair standing in for a large MCP tool list. */
  private metaTools(plugin: PluginDefinition, tools: ChatTool[]): ChatTool[] {
    const prefix = prefixOf(plugin.id);
    const byName = new Map(
      tools.map((tool) => [tool.key.split(":").slice(2).join(":"), tool]),
    );
    const resolve = (args: Record<string, any>) => {
      const tool = byName.get(String(args.tool || ""));
      if (!tool)
        throw new ToolInputError(
          `Unknown ${plugin.name} tool. Call ${prefix}__find_tools first.`,
        );
      let parsed: Record<string, any> = {};
      try {
        parsed = args.arguments ? JSON.parse(String(args.arguments)) : {};
      } catch {
        throw new ToolInputError("arguments must be JSON text");
      }
      return { tool, args: parsed };
    };
    const find: ChatTool = {
      name: `${prefix}__find_tools`,
      key: `meta:${plugin.id}:find`,
      pluginId: plugin.id,
      label: "Finding the right tool",
      description: `Search ${plugin.name}'s ${tools.length} tools by what you want to do; returns names, descriptions and argument schemas to use with ${prefix}__run_tool.`,
      gemini: {
        type: "object",
        properties: {
          query: { type: "string", description: "What you want to do" },
        },
        required: ["query"],
      },
      openai: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
      },
      writes: () => false,
      risk: "low",
      preview: () => ({ title: "Find tools", fields: [] }),
      run: async (_ctx, args) => {
        const words = String(args.query || "")
          .toLowerCase()
          .split(/\W+/)
          .filter(Boolean);
        return [...byName.entries()]
          .map(([name, tool]) => ({
            name,
            tool,
            score: words.filter((word) =>
              `${name} ${tool.description}`.toLowerCase().includes(word),
            ).length,
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 12)
          .map(({ name, tool }) => ({
            tool: name,
            description: tool.description.slice(0, 400),
            arguments: tool.openai,
            changesData: tool.writes({}),
          }));
      },
    };
    const run: ChatTool = {
      name: `${prefix}__run_tool`,
      key: `meta:${plugin.id}:run`,
      pluginId: plugin.id,
      label: "Using a tool",
      description: `Run one ${plugin.name} tool found with ${prefix}__find_tools. Tools that change data ask the user to confirm.`,
      gemini: {
        type: "object",
        properties: {
          tool: { type: "string", description: "Tool name" },
          arguments: { type: "string", description: "Arguments as JSON text" },
        },
        required: ["tool"],
      },
      openai: {
        type: "object",
        properties: { tool: { type: "string" }, arguments: { type: "string" } },
        required: ["tool"],
      },
      writes: (args) => {
        try {
          return resolve(args).tool.writes({});
        } catch {
          return false;
        }
      },
      risk: "high",
      preview: (args) => {
        const { tool, args: inner } = resolve(args);
        return tool.preview(inner);
      },
      run: (ctx, args) => {
        const { tool, args: inner } = resolve(args);
        return tool.run(ctx, inner);
      },
    };
    return [find, run];
  }

  /** Tools for the plugins this user turned on; null when there are none. */
  async toolset(userId: number): Promise<ChatToolset | null> {
    const connected = await this.integrations.connectedPlugins(userId);
    if (!connected.length) return null;
    const plugins = connected.map((item) => item.plugin);
    const groups = await Promise.all(
      plugins.map(async (plugin) => ({
        plugin,
        tools:
          plugin.auth.type === "mcp"
            ? await this.mcpToolsFor(userId, plugin).catch(
                () => [] as ChatTool[],
              )
            : ALL_TOOLS.filter((tool) => tool.pluginId === plugin.id).map(
                (tool) => fromRest(tool, plugin),
              ),
      })),
    );
    const total = groups.reduce((sum, group) => sum + group.tools.length, 0);
    const tools = groups.flatMap(({ plugin, tools: list }) =>
      total > DIRECT_TOOL_LIMIT &&
      plugin.auth.type === "mcp" &&
      list.length > 12
        ? this.metaTools(plugin, list)
        : list,
    );
    return {
      tools,
      plugins,
      policies: Object.fromEntries(
        connected.map((item) => [item.plugin.id, item.policy]),
      ),
    };
  }

  geminiTools(set: ChatToolset) {
    return [
      {
        functionDeclarations: set.tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          ...(tool.gemini ? { parameters: tool.gemini } : {}),
        })),
      },
    ];
  }
  openAiTools(set: ChatToolset) {
    return set.tools.map((tool) => ({
      type: "function" as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.openai,
      },
    }));
  }
  systemPrompt(set: ChatToolset) {
    const skills = set.plugins
      .filter((plugin) => plugin.skill)
      .map((plugin) => plugin.skill!);
    const apps = set.plugins.filter((plugin) => !plugin.skill);
    return [
      ...(apps.length
        ? [
            `Connected plugins: ${apps.map((plugin) => plugin.name).join(", ")}. Use their tools whenever the user asks about those services, and act in them on the user's behalf; do not guess data a tool can fetch. Prefer specific tools; use a raw API tool only when no specific tool fits.`,
            "Tools that change data (send, publish, pay, create, update, delete) usually do not run immediately: calling one shows the user a confirmation card with the exact details, and it runs only after they click Confirm. Fill every argument exactly as it should be sent. When a result says it is awaiting confirmation, tell the user briefly what is waiting and never claim it is done.",
            "If a tool returns an error, explain it plainly and suggest a fix such as reconnecting the plugin.",
          ]
        : []),
      ...skills,
    ].join("\n");
  }
  activity(set: ChatToolset, name: string) {
    const tool = set.tools.find((item) => item.name === name);
    const plugin = tool && findPlugin(tool.pluginId);
    return tool && plugin ? `${plugin.name} · ${tool.label}` : "Using a plugin";
  }

  async call(
    userId: number,
    set: ChatToolset,
    name: string,
    rawArgs: unknown,
    scope: { conversationId?: number },
  ): Promise<ToolCallOutcome> {
    const tool = set.tools.find((item) => item.name === name);
    if (!tool)
      return {
        output: {
          error: `Tool ${name} is not available. Only connected plugins can be used.`,
        },
      };
    const args =
      rawArgs && typeof rawArgs === "object" && !Array.isArray(rawArgs)
        ? (rawArgs as Record<string, any>)
        : {};
    try {
      const allowed =
        set.policies[tool.pluginId] === "low-risk" && tool.risk === "low";
      if (tool.writes(args) && !allowed)
        return await this.propose(userId, tool, args, scope);
      return {
        output: { result: compact(await this.execute(userId, tool, args)) },
      };
    } catch (error) {
      return { output: { error: this.errorMessage(error) } };
    }
  }

  private errorMessage(error: unknown) {
    if (error instanceof ToolInputError)
      return `Invalid arguments: ${error.message}`;
    if (error instanceof ProviderError)
      return error.status === 401 || error.status === 403
        ? `${error.message}. The plugin may need to be reconnected or lacks permission.`
        : error.message;
    if (error instanceof McpAuthError)
      return "The plugin's sign-in was rejected. Reconnect it on the Plugins page.";
    const message = (error as Error)?.message || "Tool failed";
    if (/abort|timeout/i.test(message))
      return "The provider did not respond in time";
    return message.slice(0, 600);
  }

  private async execute(
    userId: number,
    tool: ChatTool,
    args: Record<string, any>,
  ) {
    const ctx = await this.integrations.context(userId, tool.pluginId);
    try {
      return await tool.run(ctx, args);
    } catch (error) {
      // An access token can be revoked early; one forced refresh, then give up.
      const unauthorized =
        (error instanceof ProviderError && error.status === 401) ||
        error instanceof McpAuthError;
      if (!unauthorized) throw error;
      return tool.run(
        await this.integrations.context(userId, tool.pluginId, true),
        args,
      );
    }
  }

  private async propose(
    userId: number,
    tool: ChatTool,
    args: Record<string, any>,
    scope: { conversationId?: number },
  ): Promise<ToolCallOutcome> {
    const plugin = findPlugin(tool.pluginId)!;
    const preview = tool.preview(args);
    const action = await this.actions.save(
      this.actions.create({
        id: randomUUID(),
        userId,
        conversationId: scope.conversationId ?? null,
        messageId: null,
        pluginId: tool.pluginId,
        tool: tool.key.slice(0, 64),
        args:
          tool.key.startsWith("meta:") || tool.key.length > 64
            ? { __key: tool.key, ...args }
            : args,
        preview: preview as unknown as Record<string, unknown>,
        status: "pending",
        result: null,
        expiresAt: new Date(Date.now() + ACTION_TTL_MS),
      }),
    );
    const card: ActionCard = {
      id: action.id,
      plugin: plugin.id,
      pluginName: plugin.name,
      title: preview.title,
      fields: preview.fields,
      body: preview.body,
      status: "pending",
    };
    return {
      actionId: action.id,
      card: actionFence(card),
      output: {
        status: "awaiting_user_confirmation",
        actionId: action.id,
        note: "A confirmation card with these details is now shown to the user. Nothing has been sent or changed yet.",
      },
    };
  }

  /** Finds the tool a stored action refers to, rebuilding MCP tools from the provider's list. */
  private async resolve(
    userId: number,
    action: IntegrationAction,
  ): Promise<{ tool: ChatTool; args: Record<string, any> }> {
    const { __key, ...rest } = action.args as Record<string, any>;
    const key = String(__key || action.tool);
    const plugin = findPlugin(action.pluginId);
    if (!plugin) throw new Error("This plugin no longer exists");
    if (key.startsWith("mcp:") || key.startsWith("meta:")) {
      const tools = await this.mcpToolsFor(userId, plugin);
      if (key.startsWith("meta:")) {
        const run = this.metaTools(plugin, tools).find(
          (tool) => tool.key === key,
        );
        if (run) return { tool: run, args: rest };
      }
      const tool = tools.find((item) => item.key === key);
      if (tool) return { tool, args: rest };
      throw new Error("This tool is no longer offered by the provider");
    }
    const rest_ = ALL_TOOLS.find((tool) => tool.name === key);
    if (!rest_) throw new Error("This tool is no longer available");
    return { tool: fromRest(rest_, plugin), args: rest };
  }

  /** Links proposed actions to the saved reply so confirming can update its card. */
  async attachMessage(userId: number, actionIds: string[], messageId: number) {
    if (actionIds.length)
      await this.actions.update({ id: In(actionIds), userId }, { messageId });
  }

  private publicAction(action: IntegrationAction) {
    return {
      id: action.id,
      plugin: action.pluginId,
      tool: action.tool,
      status: action.status,
      preview: action.preview,
      result: action.result,
      expiresAt: action.expiresAt,
    };
  }
  private async own(userId: number, id: string) {
    const action = await this.actions.findOne({ where: { id, userId } });
    if (!action) throw new NotFoundException("Action not found");
    return action;
  }
  async get(userId: number, id: string) {
    return this.publicAction(await this.own(userId, id));
  }

  async confirm(userId: number, id: string) {
    const action = await this.own(userId, id);
    if (action.status !== "pending")
      throw new ConflictException(`This action is already ${action.status}`);
    if (action.expiresAt.getTime() < Date.now()) {
      await this.finish(action, "cancelled", null, "Expired");
      throw new GoneException("This action expired. Ask again in the chat.");
    }
    // Claim it atomically so a double click cannot run the action twice.
    const claimed = await this.actions.update(
      { id, userId, status: "pending" },
      { status: "running" },
    );
    if (!claimed.affected)
      throw new ConflictException("This action is already running");
    try {
      const { tool, args } = await this.resolve(userId, action);
      const result = await this.execute(userId, tool, args);
      const summary = `${(action.preview as any).title || tool.label} — done`;
      await this.finish(action, "done", {
        summary,
        url: resultLink(result),
        data: compact(result),
      });
    } catch (error) {
      await this.finish(action, "failed", null, this.errorMessage(error));
    }
    return this.publicAction(action);
  }

  async cancel(userId: number, id: string) {
    const action = await this.own(userId, id);
    if (action.status !== "pending")
      throw new ConflictException(`This action is already ${action.status}`);
    await this.finish(action, "cancelled", null);
    return this.publicAction(action);
  }

  private async finish(
    action: IntegrationAction,
    status: IntegrationAction["status"],
    result: Record<string, unknown> | null,
    error?: string,
  ) {
    action.status = status;
    action.result = error ? { error } : result;
    await this.actions.update(
      { id: action.id },
      { status, result: action.result as any },
    );
    if (!action.messageId || !this.messages) return;
    try {
      const message = await this.messages.findOne({
        where: { id: action.messageId, userId: action.userId },
      });
      if (!message) return;
      message.content = updateActionFence(message.content, action.id, {
        status,
        ...(result
          ? {
              result: {
                summary: String(result.summary),
                url: result.url as string | undefined,
              },
            }
          : {}),
        ...(error ? { error } : {}),
      });
      await this.messages.update(
        { id: message.id },
        { content: message.content },
      );
    } catch (failure: any) {
      this.logger.warn(
        `Could not update action card ${action.id}: ${failure?.message}`,
      );
    }
  }
}
