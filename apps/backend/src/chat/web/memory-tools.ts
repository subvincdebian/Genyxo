import type { WorkspaceService } from "../workspace/workspace.service";

/**
 * The model's own memory: it saves lasting facts the user shares ("I write C++",
 * "I live in Kyiv") and forgets them on request. They are the same memory
 * records the user sees and edits in Settings → Memory.
 */
const TOOLS = [
  {
    name: "genyxo_remember",
    label: "Updating memory",
    description:
      "Save one lasting fact or preference about the user for future chats, written in third person (e.g. 'Writes C++ in CLion', 'Lives in Kyiv', 'Prefers short answers').",
    parameters: {
      type: "object",
      properties: {
        fact: {
          type: "string",
          description: "A short fact, at most one sentence",
        },
      },
      required: ["fact"],
    },
  },
  {
    name: "genyxo_forget",
    label: "Updating memory",
    description:
      "Forget saved facts about the user that match these words, when the user asks to forget something.",
    parameters: {
      type: "object",
      properties: {
        about: { type: "string", description: "Words of the fact to forget" },
      },
      required: ["about"],
    },
  },
];

export const isMemoryTool = (name: string) =>
  TOOLS.some((tool) => tool.name === name);
export const memoryActivity = () => "Updating memory";
export const memoryGeminiDeclarations = () =>
  TOOLS.map(({ name, description, parameters }) => ({
    name,
    description,
    parameters,
  }));
export const memoryOpenAiTools = () =>
  TOOLS.map(({ name, description, parameters }) => ({
    type: "function" as const,
    function: { name, description, parameters },
  }));

export const MEMORY_PROMPT =
  "You have long-term memory. When the user shares a lasting fact or preference about themselves (job, skills, tools, city, language, goals, how they like answers), call genyxo_remember with a short third-person fact, without announcing it at length. Do not save passing details, secrets, passwords, health, finances or exact addresses unless the user asks you to remember them. When the user asks you to forget something, call genyxo_forget.";

const fence = (action: "saved" | "forgotten", fact: string) =>
  `\n\n\`\`\`genyxo-memory\n${JSON.stringify({ action, fact })}\n\`\`\`\n\n`;

/** Runs a memory tool: `output` is for the model, `markdown` the "Memory updated" pill. */
export async function runMemoryTool(
  workspace: WorkspaceService,
  userId: number,
  name: string,
  args: Record<string, any>,
) {
  try {
    if (name === "genyxo_remember") {
      const fact = String(args.fact || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 300);
      if (!fact)
        return { output: { error: "Invalid arguments: fact is required" } };
      const { items } = await workspace.listMemory(userId, null);
      if (
        items.some(
          (item: any) =>
            String(item.content).toLowerCase() === fact.toLowerCase(),
        )
      )
        return { output: { saved: false, note: "Already remembered" } };
      await workspace.saveMemory(userId, { content: fact });
      return { output: { saved: true }, markdown: fence("saved", fact) };
    }
    if (name === "genyxo_forget") {
      const about = String(args.about || "")
        .toLowerCase()
        .trim();
      if (!about)
        return { output: { error: "Invalid arguments: about is required" } };
      const { items } = await workspace.listMemory(userId, null);
      const words = about.split(/\s+/).filter((word) => word.length > 2);
      const matches = items.filter((item: any) => {
        const content = String(item.content).toLowerCase();
        return (
          content.includes(about) ||
          (words.length > 0 && words.every((word) => content.includes(word)))
        );
      });
      for (const item of matches)
        await workspace.deleteRecord(userId, "memory", item.id);
      return {
        output: { forgotten: matches.length },
        markdown: matches.length
          ? fence(
              "forgotten",
              matches
                .map((item: any) => item.content)
                .join("; ")
                .slice(0, 300),
            )
          : undefined,
      };
    }
    return { output: { error: "Unknown memory tool" } };
  } catch (error: any) {
    return {
      output: {
        error: String(error?.message || "Memory is unavailable").slice(0, 200),
      },
    };
  }
}
