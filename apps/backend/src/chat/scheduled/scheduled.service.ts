import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import { InjectRepository } from "@nestjs/typeorm";
import { randomUUID } from "crypto";
import { Writable } from "stream";
import type { ServerResponse } from "http";
import { Repository } from "typeorm";
import { Conversation } from "../conversation.entity";
import { WorkspaceRecord } from "../workspace/workspace-record.entity";
import { UsersService } from "../../users/users.service";
import { PricingService } from "../pricing.service";
import { ChatService } from "../chat.service";
import {
  describeSchedule,
  isTimeZone,
  localDate,
  nextRun,
  REPEATS,
  Schedule,
  validSchedule,
  wallClock,
} from "./schedule";

export type TaskStatus = "active" | "paused" | "completed";
type Place = { name: string; lat: number; lng: number; address?: string };
export type TaskData = {
  title: string;
  prompt: string;
  schedule: Schedule;
  timezone: string;
  status: TaskStatus;
  conversationId: number | null;
  model: string;
  location?: { lat: number; lng: number } | null;
  places?: Place[];
  language?: string;
  nextRunAt: string | null;
  lastRunAt?: string | null;
  lastError?: string | null;
  runs?: number;
  runningSince?: string | null;
};
type Input = Record<string, any>;

const DEFAULT_MODEL = "google/gemini-3.5-flash-lite";
const TICK_MS = 15_000;
/** A run that never finished (a restart mid-run) is retried after this. */
const STALE_RUN_MS = 15 * 60_000;
const MAX_TASKS = 50;

/**
 * Scheduled tasks ("every morning — weather, the drive to work and local
 * news"): kept as workspace records, run by a timer in the API process
 * through the normal chat pipeline, so each run is an answer in the task's
 * chat with the same tools (web, maps, memory) a typed message gets.
 */
@Injectable()
export class ScheduledService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ScheduledService.name);
  private timer?: ReturnType<typeof setInterval>;
  private readonly running = new Set<number>();
  private ticking = false;

  constructor(
    @InjectRepository(WorkspaceRecord)
    private readonly records: Repository<WorkspaceRecord>,
    @InjectRepository(Conversation)
    private readonly conversations: Repository<Conversation>,
    private readonly users: UsersService,
    private readonly pricing: PricingService,
    private readonly moduleRef: ModuleRef,
  ) {}

  onModuleInit() {
    if (process.env.NODE_ENV === "test") return;
    this.timer = setInterval(() => void this.tick(), TICK_MS);
    this.timer.unref();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  serialize(row: WorkspaceRecord) {
    const data = row.data as TaskData;
    return {
      id: row.id,
      title: data.title,
      prompt: data.prompt,
      schedule: data.schedule,
      summary: describeSchedule(data.schedule),
      timezone: data.timezone,
      status: data.status,
      conversationId: data.conversationId,
      model: data.model,
      hasLocation: Boolean(data.location),
      nextRunAt: data.status === "active" ? data.nextRunAt : null,
      lastRunAt: data.lastRunAt || null,
      lastError: data.lastError || null,
      runs: data.runs || 0,
      running: this.running.has(row.id),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private async row(userId: number, id: number) {
    const row = await this.records.findOne({
      where: { id: Number(id), userId, kind: "task" },
    });
    if (!row) throw new NotFoundException("Task not found");
    return row;
  }

  async list(userId: number, status?: string) {
    const rows = await this.records.find({
      where: { userId, kind: "task" },
      order: { id: "DESC" },
      take: 200,
    });
    const items = rows
      .map((row) => this.serialize(row))
      .filter((task) => !status || task.status === status);
    return { items, available: true };
  }

  async get(userId: number, id: number) {
    return this.serialize(await this.row(userId, id));
  }

  /** The earliest upcoming run, so an open page knows when to look for a new answer. */
  async nextRunAt(userId: number) {
    const { items } = await this.list(userId, "active");
    return (
      items
        .map((task) => task.nextRunAt)
        .filter((value): value is string => Boolean(value))
        .sort()[0] || null
    );
  }

  private text(value: unknown, name: string, max: number) {
    const text = typeof value === "string" ? value.trim() : "";
    if (!text) throw new BadRequestException(`${name} is required`);
    return text.slice(0, max);
  }

  /** Validates and fills a schedule; "inMinutes" becomes a one-off date and time. */
  private schedule(
    input: Input,
    timezone: string,
    previous?: Schedule,
  ): Schedule {
    const now = new Date();
    if (input.inMinutes !== undefined && input.inMinutes !== null) {
      const minutes = Math.round(Number(input.inMinutes));
      if (!Number.isFinite(minutes) || minutes < 1 || minutes > 10_080)
        throw new BadRequestException("inMinutes must be 1–10080");
      const at = wallClock(
        new Date(now.getTime() + minutes * 60_000),
        timezone,
      );
      const pad = (value: number) => String(value).padStart(2, "0");
      return {
        repeat: "once",
        date: `${at.year}-${pad(at.month)}-${pad(at.day)}`,
        time: `${pad(at.hour)}:${pad(at.minute)}`,
      };
    }
    const schedule = {
      repeat: input.repeat ?? previous?.repeat ?? "once",
      time: String(input.time ?? previous?.time ?? "09:00").padStart(5, "0"),
      date: String(input.date ?? previous?.date ?? localDate(now, timezone)),
    };
    if (!validSchedule(schedule))
      throw new BadRequestException(
        `Schedule needs repeat (${REPEATS.join(", ")}), time HH:MM and date YYYY-MM-DD`,
      );
    return schedule;
  }

  private location(value: unknown) {
    if (!value || typeof value !== "object") return null;
    const { lat, lng } = value as Input;
    return Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))
      ? { lat: Number(lat), lng: Number(lng) }
      : null;
  }

  /** Saved places ("@Home", "@Work") the run may route to. */
  private places(value: unknown): Place[] {
    if (!Array.isArray(value)) return [];
    return value
      .filter(
        (place): place is Input =>
          Boolean(place) &&
          typeof place === "object" &&
          typeof place.name === "string" &&
          Number.isFinite(Number(place.lat)) &&
          Number.isFinite(Number(place.lng)),
      )
      .slice(0, 8)
      .map((place) => ({
        name: String(place.name).slice(0, 80),
        lat: Number(place.lat),
        lng: Number(place.lng),
        ...(typeof place.address === "string"
          ? { address: place.address.slice(0, 160) }
          : {}),
      }));
  }

  async create(
    userId: number,
    input: Input,
    defaults: {
      conversationId?: number | null;
      model?: string;
      timezone?: string;
      location?: unknown;
      places?: Place[];
      language?: string;
    } = {},
  ) {
    const count = await this.records.count({ where: { userId, kind: "task" } });
    if (count >= MAX_TASKS)
      throw new BadRequestException(`You can keep up to ${MAX_TASKS} tasks`);
    const timezone = String(input.timezone || defaults.timezone || "UTC");
    if (!isTimeZone(timezone))
      throw new BadRequestException("Unknown time zone");
    const title = this.text(input.title, "title", 80);
    const schedule = this.schedule(input, timezone);
    let conversationId =
      Number(input.conversationId ?? defaults.conversationId) || null;
    if (conversationId) {
      const owned = await this.conversations.findOne({
        where: { id: conversationId, userId },
      });
      if (!owned) conversationId = null;
    }
    // A task made on the Scheduled page gets its own chat for its answers.
    if (!conversationId)
      conversationId = (
        await this.conversations.save(
          this.conversations.create({
            userId,
            title,
            titleSource: "manual",
            titleStatus: "complete",
          }),
        )
      ).id;
    const model = String(input.model || defaults.model || DEFAULT_MODEL);
    const data: TaskData = {
      title,
      prompt: this.text(input.prompt, "prompt", 4000),
      schedule,
      timezone,
      status: "active",
      conversationId,
      model: this.pricing.getModelConfig(model) ? model : DEFAULT_MODEL,
      location: this.location(input.location ?? defaults.location),
      places: this.places(input.places ?? defaults.places),
      language: defaults.language,
      nextRunAt: nextRun(schedule, timezone, new Date())?.toISOString() || null,
      runs: 0,
    };
    if (!data.nextRunAt)
      throw new BadRequestException("That time has already passed");
    const row = await this.records.save(
      this.records.create({
        userId,
        kind: "task",
        recordKey: randomUUID(),
        data,
      }),
    );
    return this.serialize(row);
  }

  async update(userId: number, id: number, input: Input) {
    const row = await this.row(userId, id);
    const data = { ...(row.data as TaskData) };
    if (input.title !== undefined)
      data.title = this.text(input.title, "title", 80);
    if (input.prompt !== undefined)
      data.prompt = this.text(input.prompt, "prompt", 4000);
    if (input.timezone !== undefined) {
      if (!isTimeZone(String(input.timezone)))
        throw new BadRequestException("Unknown time zone");
      data.timezone = String(input.timezone);
    }
    const timing = ["repeat", "time", "date", "inMinutes", "timezone"].some(
      (key) => input[key] !== undefined,
    );
    if (timing)
      data.schedule = this.schedule(input, data.timezone, data.schedule);
    if (input.status !== undefined) {
      if (!["active", "paused"].includes(input.status))
        throw new BadRequestException("status must be active or paused");
      data.status = input.status;
    }
    // Editing the time of a finished one-off task brings it back.
    if (timing && data.status === "completed") data.status = "active";
    if (timing || input.status === "active") {
      data.nextRunAt =
        nextRun(data.schedule, data.timezone, new Date())?.toISOString() ||
        null;
      if (!data.nextRunAt && data.status === "active")
        throw new BadRequestException("That time has already passed");
    }
    row.data = data;
    return this.serialize(await this.records.save(row));
  }

  async remove(userId: number, id: number) {
    await this.records.delete({ id: (await this.row(userId, id)).id, userId });
    return { success: true };
  }

  async runNow(userId: number, id: number) {
    const row = await this.row(userId, id);
    if (this.running.has(row.id))
      throw new BadRequestException("This task is already running");
    void this.run(row, false);
    return { ...this.serialize(row), running: true };
  }

  /** Runs every task that is due. One process owns the timer; runs never overlap. */
  async tick(now = new Date()) {
    if (this.ticking) return;
    this.ticking = true;
    try {
      const stale = new Date(now.getTime() - STALE_RUN_MS).toISOString();
      const due = await this.records
        .createQueryBuilder("record")
        .where("record.kind = :kind", { kind: "task" })
        .andWhere(
          "JSON_UNQUOTE(JSON_EXTRACT(record.data, '$.status')) = 'active'",
        )
        .andWhere(
          "JSON_UNQUOTE(JSON_EXTRACT(record.data, '$.nextRunAt')) <= :now",
          {
            now: now.toISOString(),
          },
        )
        .orderBy("record.id", "ASC")
        .take(10)
        .getMany();
      for (const row of due) {
        const since = (row.data as TaskData).runningSince;
        if (this.running.has(row.id) || (since && since > stale)) continue;
        await this.run(row, true);
      }
    } catch (error) {
      this.logger.warn(`Scheduled tick failed: ${(error as Error).message}`);
    } finally {
      this.ticking = false;
    }
  }

  /** One run: the task's prompt goes through the chat pipeline into its chat. */
  async run(row: WorkspaceRecord, scheduled: boolean) {
    const data = row.data as TaskData;
    this.running.add(row.id);
    const started = new Date();
    await this.records.save(
      Object.assign(row, {
        data: { ...data, runningSince: started.toISOString() },
      }),
    );
    let error: string | null = null;
    try {
      const cost = this.pricing.getModelConfig(data.model)?.cost ?? 0;
      if (!(await this.users.deductCredits(row.userId, cost)))
        throw new Error("Not enough credits");
      let conversationId = data.conversationId;
      const exists =
        conversationId &&
        (await this.conversations.findOne({
          where: { id: conversationId, userId: row.userId },
        }));
      if (!exists)
        conversationId = (
          await this.conversations.save(
            this.conversations.create({
              userId: row.userId,
              title: data.title,
              titleSource: "manual",
              titleStatus: "complete",
            }),
          )
        ).id;
      data.conversationId = conversationId;
      // The chat pipeline streams to a response; a run streams to nowhere and
      // keeps the error event, if any, to show on the task.
      let failure: string | null = null;
      const sink = new Writable({
        write(chunk: Buffer, _encoding, done) {
          const text = chunk.toString();
          const match = /"error":"((?:[^"\\]|\\.)*)"/.exec(text);
          if (match) failure = JSON.parse(`"${match[1]}"`);
          done();
        },
      });
      // Resolved at run time: ChatService also injects this service.
      const chat = this.moduleRef.get(ChatService, { strict: false });
      await chat.processStreamingMessage(
        row.userId,
        data.prompt,
        data.model,
        conversationId!,
        cost,
        [],
        sink as unknown as ServerResponse,
        undefined,
        undefined,
        undefined,
        {
          scheduledTask: { id: row.id, title: data.title, prompt: data.prompt },
          location: data.location || undefined,
          pinnedPlaces: data.places?.length ? data.places : undefined,
          language: data.language,
        },
      );
      error = failure;
    } catch (caught) {
      error = (caught as Error).message || "The task failed";
      this.logger.warn(`Task ${row.id} failed: ${error}`);
    } finally {
      this.running.delete(row.id);
      // Re-read: the user may have edited or paused it while it ran.
      const fresh = await this.records.findOne({ where: { id: row.id } });
      if (fresh) {
        const latest = { ...(fresh.data as TaskData) };
        latest.runningSince = null;
        latest.lastRunAt = started.toISOString();
        latest.lastError = error;
        latest.runs = (latest.runs || 0) + 1;
        latest.conversationId = data.conversationId;
        if (scheduled || latest.status === "active") {
          const next = nextRun(latest.schedule, latest.timezone, new Date());
          latest.nextRunAt = next?.toISOString() || null;
          if (!next && latest.status === "active") latest.status = "completed";
        }
        fresh.data = latest;
        await this.records.save(fresh);
      }
    }
  }
}
