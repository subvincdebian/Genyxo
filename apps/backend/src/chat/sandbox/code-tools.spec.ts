import {
  describeCodeFences,
  codeFence,
  isSpreadsheet,
  sandboxInputs,
} from "./code-tools";
import { settleGeminiStream } from "../chat.service";

describe("code sandbox tools", () => {
  it("recognizes spreadsheets by name or type", () => {
    expect(isSpreadsheet("Sales.XLSX")).toBe(true);
    expect(isSpreadsheet("data.bin", "application/vnd.ms-excel")).toBe(true);
    expect(isSpreadsheet("notes.txt", "text/plain")).toBe(false);
  });

  it("passes each attached file once, newest first", () => {
    const inputs = sandboxInputs([
      { name: "a.xlsx", mime_type: "x", data: "AAAA" },
      { name: "a.xlsx", mime_type: "x", data: "BBBB" },
      { name: "no-data.pdf", mime_type: "application/pdf" },
    ]);
    expect(inputs).toEqual([{ name: "a.xlsx", data: "AAAA" }]);
  });

  it("shows later turns a short summary of a run", () => {
    const text = `Done.${codeFence({ code: "print(1)", ok: true, stdout: "42", error: null, seconds: 1, files: [{ id: "1", name: "summary.xlsx", mime: "x", size: 1, url: "/x" }] })}`;
    expect(describeCodeFences(text)).toContain(
      "[Ran Python; produced summary.xlsx; output: 42]",
    );
  });

  it("keeps a broken Gemini stream from rejecting unhandled", async () => {
    const response = Promise.reject(new Error("Failed to parse stream"));
    const result = settleGeminiStream({ response, stream: [] });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(result.stream).toEqual([]);
  });
});
