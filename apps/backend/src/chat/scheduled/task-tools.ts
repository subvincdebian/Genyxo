import { REPEATS, wallClock } from "./schedule";

/**
 * "Text me 'Hello' in a minute", "every morning send me the weather":
 * the model turns these into a scheduled task whose answer arrives in this
 * chat later. The user sees a task card they can open and edit.
 */
const SCHEDULE_TOOL = {
  name: "genyxo_schedule_task",
  description:
    "Schedule a task that runs later, once or on a repeat, and posts its answer in this chat: reminders, messages at a set time, daily or weekly briefings and digests. Use it whenever the user asks for something later, at a time, or regularly.",
  parameters: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description:
          "Short name in the user's language, 2–6 words, e.g. 'Привіт через хвилину', 'Morning briefing'",
      },
      prompt: {
        type: "string",
        description:
          "What to do when it runs, written as an instruction to yourself in the user's language, e.g. 'Напиши користувачу рівно «Привіт».' or 'Give a short morning briefing: today's weather here, the drive to @Work and the top local news.'",
      },
      repeat: { type: "string", enum: REPEATS },
      time: {
        type: "string",
        description: "Local time HH:MM (24-hour) in the user's time zone",
      },
      date: {
        type: "string",
        description:
          "Local date YYYY-MM-DD: the day of a one-off task or the first day of a repeating one. Default: today",
      },
      inMinutes: {
        type: "number",
        description:
          "For 'in N minutes/hours': minutes from now (1–10080). Replaces date and time.",
      },
    },
    required: ["title", "prompt", "repeat"],
  },
};

export const isTaskTool = (name: string) => name === SCHEDULE_TOOL.name;
export const taskActivity = () => "Scheduling the task";
export const taskGeminiDeclarations = () => [SCHEDULE_TOOL];
export const taskOpenAiTools = () => [
  { type: "function" as const, function: SCHEDULE_TOOL },
];

export function taskPrompt(now: Date, timeZone: string) {
  const wall = wallClock(now, timeZone);
  const pad = (value: number) => String(value).padStart(2, "0");
  return [
    `Now it is ${wall.year}-${pad(wall.month)}-${pad(wall.day)} ${pad(wall.hour)}:${pad(wall.minute)} in the user's time zone (${timeZone}).`,
    "Scheduling: whenever the user wants something done later, at a set time or regularly — in any language, e.g. 'через хвилину напиши мені «Привіт»', 'нагадай завтра о 9', 'каждое утро присылай погоду', 'text me in a minute', 'every Monday send me news' — call genyxo_schedule_task. It is the only way to act later: never use plugin tools (GitHub, mail, etc.) for this and never reply right away with the message itself.",
    "Afterwards confirm in one short sentence in the user's language, starting with ✅; the task card with its time appears by itself, so do not repeat the date or add links.",
  ].join(" ");
}

/** The card a scheduled task shows in the chat. */
export const taskFence = (task: { id: number; title: string }) =>
  `\n\n\`\`\`genyxo-task\n${JSON.stringify({ id: task.id, title: task.title })}\n\`\`\`\n`;

/** How a task run looks in the conversation: a header, not a user bubble. */
export const taskRunContent = (task: {
  id: number;
  title: string;
  prompt: string;
}) =>
  `\`\`\`genyxo-task-run\n${JSON.stringify({ id: task.id, title: task.title, prompt: task.prompt })}\n\`\`\``;

const TASK_FENCE = /```genyxo-(task|task-run)\n([\s\S]*?)\n```/g;

/** Model history: task cards and runs as plain sentences. */
export function describeTaskFences(content: string) {
  if (!content.includes("```genyxo-task")) return content;
  return content.replace(TASK_FENCE, (_match, kind: string, json: string) => {
    try {
      const card = JSON.parse(json);
      return kind === "task"
        ? `[Scheduled task #${card.id}: ${card.title}]`
        : `Scheduled task “${card.title}” is running now. Do it: ${card.prompt}`;
    } catch {
      return "";
    }
  });
}

export function taskRunPrompt(title: string) {
  return `This turn is the scheduled task “${title}” running on its own; the user is not typing live. Do exactly what the task says and answer directly, without questions or offers to schedule anything.`;
}
