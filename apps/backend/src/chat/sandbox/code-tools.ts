import type { IAttachedFile } from "../message.entity";
import type { SandboxService } from "./sandbox.service";

/**
 * genyxo_run_python: any chat model can run Python on the user's files
 * (spreadsheets, CSV, PDFs) and return numbers, charts and new files.
 */
const TOOL = {
  name: "genyxo_run_python",
  description:
    "Run Python 3.12 in an isolated sandbox and get its printed output, charts and files. Use it for calculations, data analysis, reading or editing spreadsheets (Excel, CSV), building charts and producing files to download. Files the user attached are in the input/ folder. Save files for the user in output/. Matplotlib figures are saved automatically. pandas, numpy, matplotlib, seaborn, scipy, openpyxl, xlsxwriter, python-docx, pypdf and reportlab are installed. There is no internet access.",
  parameters: {
    type: "object",
    properties: {
      code: {
        type: "string",
        description: "A complete Python program; print what you need to see",
      },
    },
    required: ["code"],
  },
};

/** Excel and other spreadsheets, which only the sandbox can open. */
export const isSpreadsheet = (name = "", mime = "") =>
  /\.(xlsx|xlsm|xls|ods)$/i.test(name) ||
  /spreadsheetml|ms-excel|opendocument\.spreadsheet/.test(mime);

export const isCodeTool = (name: string) => name === TOOL.name;
export const codeActivity = () => "Running Python";
export const codeGeminiDeclarations = () => [TOOL];
export const codeOpenAiTools = () => [
  { type: "function" as const, function: TOOL },
];

export const codePrompt = (files: string[]) =>
  [
    "You can run Python with genyxo_run_python. Use it whenever an answer depends on computing, analyzing data or making a chart or file; never invent numbers you could compute.",
    files.length
      ? `Files the user attached, available in input/: ${files.join(", ")}. Inspect a file (sheets, columns, first rows) before analyzing it.`
      : "",
    "Write a short, readable program per call and print compact results (not whole tables). If it fails, fix the code and run it again. Put files the user should download in output/ with clear names; one chart per figure with a title and labeled axes.",
    "After running, explain the results in plain words. The files and charts appear in the chat automatically, so do not paste their contents or links.",
  ]
    .filter(Boolean)
    .join(" ");

/** Files with data from the conversation, newest first, one per name. */
export function sandboxInputs(
  files: IAttachedFile[],
  maxBytes = 40 * 1024 * 1024,
) {
  const picked: { name: string; data: string }[] = [];
  const seen = new Set<string>();
  let total = 0;
  for (const file of files) {
    if (!file.data || seen.has(file.name)) continue;
    const size = Math.floor((file.data.length * 3) / 4);
    if (total + size > maxBytes || picked.length >= 20) continue;
    seen.add(file.name);
    total += size;
    picked.push({ name: file.name, data: file.data });
  }
  return picked;
}

export interface CodeCard {
  code: string;
  ok: boolean;
  stdout: string;
  error: string | null;
  seconds: number;
  files: {
    id: string;
    name: string;
    mime: string;
    size: number;
    url: string;
  }[];
}

export const codeFence = (card: CodeCard) =>
  `\n\n\`\`\`genyxo-code\n${JSON.stringify(card)}\n\`\`\`\n\n`;

const CODE_FENCE = /```genyxo-code\n(\{.*\})\n```/g;
/** Later turns see a one-line summary instead of the card's data. */
export function describeCodeFences(content: string) {
  if (!content.includes("genyxo-code")) return content;
  return content.replace(CODE_FENCE, (_match, json: string) => {
    try {
      const card = JSON.parse(json) as CodeCard;
      const files = card.files.map((file) => file.name).join(", ");
      return `[Ran Python${card.ok ? "" : " (failed)"}${files ? `; produced ${files}` : ""}${card.stdout ? `; output: ${card.stdout.slice(0, 300)}` : ""}]`;
    } catch {
      return "[Ran Python]";
    }
  });
}

export async function runCodeTool(
  sandbox: SandboxService,
  args: Record<string, unknown>,
  inputs: { name: string; data: string }[],
  saveFile: (
    name: string,
    mime: string,
    data: Buffer,
  ) => Promise<{ id: string; url: string }>,
) {
  const code = typeof args.code === "string" ? args.code : "";
  if (!code.trim())
    return { output: { error: "Invalid arguments: code is required" } };
  try {
    const result = await sandbox.run(code, inputs);
    const files: CodeCard["files"] = [];
    for (const file of result.files) {
      const saved = await saveFile(
        file.name,
        file.mime,
        Buffer.from(file.data, "base64"),
      );
      files.push({
        id: saved.id,
        name: file.name,
        mime: file.mime,
        size: file.size,
        url: saved.url,
      });
    }
    const card: CodeCard = {
      code: code.slice(0, 20_000),
      ok: result.ok,
      stdout: result.stdout.slice(0, 8000),
      error: result.error,
      seconds: result.seconds,
      files,
    };
    return {
      // The model sees the output and errors in full, the user sees the card.
      output: {
        ok: result.ok,
        stdout: result.stdout.slice(0, 12_000),
        error: result.error,
        stderr: result.ok ? undefined : result.stderr.slice(-4000),
        files: files.map((file) => file.name),
        seconds: result.seconds,
      },
      markdown: codeFence(card),
    };
  } catch (error) {
    return {
      output: {
        error: String((error as Error).message || "The sandbox failed").slice(
          0,
          300,
        ),
      },
    };
  }
}
