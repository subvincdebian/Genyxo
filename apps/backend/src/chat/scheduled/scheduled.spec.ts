import { describeSchedule, nextRun, Repeat, zonedTime } from "./schedule";
import { ScheduledService } from "./scheduled.service";
import { describeTaskFences, taskFence, taskRunContent } from "./task-tools";
import { ShareService } from "../share/share.service";

describe("schedule", () => {
  it("turns a wall-clock time in a time zone into the right instant, DST included", () => {
    expect(zonedTime(2026, 1, 15, 8, 0, "Europe/Kyiv").toISOString()).toBe(
      "2026-01-15T06:00:00.000Z",
    );
    expect(zonedTime(2026, 7, 15, 8, 0, "Europe/Kyiv").toISOString()).toBe(
      "2026-07-15T05:00:00.000Z",
    );
    expect(zonedTime(2026, 7, 15, 8, 0, "America/New_York").toISOString()).toBe(
      "2026-07-15T12:00:00.000Z",
    );
  });

  it("finds the next run for each repeat", () => {
    const after = new Date("2026-10-26T18:00:00Z"); // Monday 20:00 in Kyiv
    const at = (repeat: Repeat, time: string, date = "2026-10-26") =>
      nextRun({ repeat, time, date }, "Europe/Kyiv", after)?.toISOString();
    expect(at("once", "20:19")).toBe("2026-10-26T18:19:00.000Z");
    expect(at("once", "19:00")).toBeUndefined();
    expect(at("daily", "08:00")).toBe("2026-10-27T06:00:00.000Z");
    expect(at("daily", "21:30")).toBe("2026-10-26T19:30:00.000Z");
    // Friday morning, then the weekend is skipped.
    expect(
      nextRun(
        { repeat: "weekdays", time: "08:00", date: "2026-10-26" },
        "Europe/Kyiv",
        new Date("2026-10-30T07:00:00Z"),
      )?.toISOString(),
    ).toBe("2026-11-02T06:00:00.000Z");
    expect(at("weekly", "09:00", "2026-10-21")).toBe(
      "2026-10-28T07:00:00.000Z",
    );
    // The 31st runs on the last day of a shorter month.
    expect(
      nextRun(
        { repeat: "monthly", time: "09:00", date: "2026-10-31" },
        "UTC",
        new Date("2026-11-01T00:00:00Z"),
      )?.toISOString(),
    ).toBe("2026-11-30T09:00:00.000Z");
    expect(
      describeSchedule({
        repeat: "weekdays",
        time: "08:00",
        date: "2026-10-26",
      }),
    ).toBe("Every weekday at 08:00");
  });
});

describe("task fences", () => {
  it("shows the model plain sentences instead of task cards and runs", () => {
    const run = taskRunContent({
      id: 4,
      title: "Hello",
      prompt: "Say «Привіт».",
    });
    expect(describeTaskFences(run)).toBe(
      "Scheduled task “Hello” is running now. Do it: Say «Привіт».",
    );
    expect(
      describeTaskFences(`✅ Done.${taskFence({ id: 4, title: "Hello" })}`),
    ).toContain("[Scheduled task #4: Hello]");
  });
});

/** In-memory repositories with just what the services use. */
function fakeRepos() {
  let nextId = 10;
  const repo = (rows: any[]) => ({
    rows,
    create: (value: any) => ({ ...value }),
    save: async (value: any) => {
      if (!value.id)
        Object.assign(value, {
          id: nextId++,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      const index = rows.findIndex((row) => row.id === value.id);
      if (index >= 0) rows[index] = value;
      else rows.push(value);
      return value;
    },
    count: async ({ where }: any) =>
      rows.filter((row) => row.userId === where.userId).length,
    find: async ({ where }: any) =>
      rows.filter((row) =>
        Object.entries(where).every(([key, value]) => row[key] === value),
      ),
    findOne: async ({ where }: any) =>
      rows.find((row) =>
        Object.entries(where).every(([key, value]) => row[key] === value),
      ) || null,
    delete: async ({ id }: any) => {
      rows.splice(
        rows.findIndex((row) => row.id === id),
        1,
      );
    },
  });
  return {
    records: repo([]),
    conversations: repo([{ id: 3, userId: 1, title: "Chat" }]),
  };
}

describe("scheduled service", () => {
  it("creates a task from the model's tool call and runs it into its chat", async () => {
    const { records, conversations } = fakeRepos();
    const calls: any[][] = [];
    const chat = {
      processStreamingMessage: async (...args: any[]) => {
        calls.push(args);
        args[6].write('data: {"token":"Привіт"}\n\n');
      },
    };
    const credits: number[] = [];
    const service = new ScheduledService(
      records as any,
      conversations as any,
      {
        deductCredits: async (_user: number, cost: number) => {
          credits.push(cost);
          return true;
        },
      } as any,
      { getModelConfig: () => ({ cost: 2 }) } as any,
      { get: () => chat } as any,
    );
    const task = await service.create(
      1,
      {
        title: "Привіт через хвилину",
        prompt: "Напиши «Привіт».",
        repeat: "once",
        inMinutes: 1,
      },
      {
        conversationId: 3,
        model: "google/gemini-3.5-flash-lite",
        timezone: "Europe/Kyiv",
      },
    );
    expect(task).toMatchObject({
      status: "active",
      conversationId: 3,
      summary: expect.stringMatching(/^Once on /),
    });
    expect(new Date(task.nextRunAt!).getTime()).toBeGreaterThan(Date.now());

    await service.run(records.rows[0], true);
    expect(credits).toEqual([2]);
    expect(calls[0].slice(0, 4)).toEqual([
      1,
      "Напиши «Привіт».",
      "google/gemini-3.5-flash-lite",
      3,
    ]);
    expect(calls[0][10].scheduledTask).toEqual({
      id: task.id,
      title: "Привіт через хвилину",
      prompt: "Напиши «Привіт».",
    });
    // A one-off task whose time has come is done after its run.
    records.rows[0].data.schedule.date = "2020-01-01";
    await service.run(records.rows[0], true);
    expect(await service.get(1, task.id)).toMatchObject({
      status: "completed",
      runs: 2,
      lastError: null,
      nextRunAt: null,
    });
  });

  it("keeps the error when a run fails and validates edits", async () => {
    const { records, conversations } = fakeRepos();
    const chat = {
      processStreamingMessage: async (...args: any[]) => {
        args[6].write('data: {"error":"Model is busy"}\n\n');
      },
    };
    const service = new ScheduledService(
      records as any,
      conversations as any,
      { deductCredits: async () => true } as any,
      { getModelConfig: () => undefined } as any,
      { get: () => chat } as any,
    );
    const task = await service.create(
      1,
      {
        title: "Morning briefing",
        prompt: "Weather and news",
        repeat: "daily",
        time: "08:00",
      },
      { timezone: "Europe/Kyiv" },
    );
    // Made on the Scheduled page, it gets its own chat.
    expect(conversations.rows.at(-1)).toMatchObject({
      title: "Morning briefing",
      userId: 1,
    });
    await service.run(records.rows[0], true);
    expect(await service.get(1, task.id)).toMatchObject({
      status: "active",
      lastError: "Model is busy",
    });
    await expect(service.update(1, task.id, { time: "25:00" })).rejects.toThrow(
      /Schedule needs/,
    );
    expect(
      await service.update(1, task.id, { status: "paused" }),
    ).toMatchObject({
      status: "paused",
      nextRunAt: null,
    });
    await expect(service.get(2, task.id)).rejects.toThrow("Task not found");
  });
});

describe("shared chats", () => {
  it("shares a snapshot and shows strangers no private cards", async () => {
    const { records, conversations } = fakeRepos();
    const messages: any[] = [
      {
        id: 1,
        conversationId: 3,
        sender: "user",
        content: "Hi",
        files: [{ name: "a.pdf" }],
        alternativeToMessageId: null,
      },
      {
        id: 2,
        conversationId: 3,
        sender: "bot",
        model: "m",
        content:
          'Hello\n\n```genyxo-memory\n{"action":"saved","fact":"x"}\n```\n\n```genyxo-media\n{"id":"abc","kind":"image","status":"done","title":"Cat"}\n```',
        alternativeToMessageId: null,
      },
    ];
    const messageRepo = {
      findOne: async () => messages.at(-1),
      find: async ({ where }: any) =>
        messages.filter((message) => message.id <= where.id.value),
    };
    const service = new ShareService(
      records as any,
      conversations as any,
      messageRepo as any,
    );
    const link: any = await service.share(1, 3);
    expect(link).toMatchObject({ shared: true, upToDate: true });
    messages.push({
      id: 3,
      conversationId: 3,
      sender: "user",
      content: "Later, private",
      files: [],
      alternativeToMessageId: null,
    });
    expect(await service.status(1, 3)).toMatchObject({ upToDate: false });
    const page = await service.publicView(link.token);
    expect(page.title).toBe("Chat");
    expect(page.messages).toEqual([
      {
        id: 1,
        role: "user",
        content: "Hi",
        attachments: ["a.pdf"],
        model: undefined,
      },
      {
        id: 2,
        role: "assistant",
        content: "Hello\n\n![Cat](/api/chat/media/abc)",
        attachments: [],
        model: "m",
      },
    ]);
    await expect(service.share(2, 3)).rejects.toThrow("Chat not found");
    await service.unshare(1, 3);
    await expect(service.publicView(link.token)).rejects.toThrow(
      "Link not found",
    );
  });
});
