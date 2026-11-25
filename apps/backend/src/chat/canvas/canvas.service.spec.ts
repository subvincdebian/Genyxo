import { editPrompt, stripFence } from "./canvas.service";

describe("canvas editing", () => {
  it("removes a code fence wrapped around the reply", () => {
    expect(stripFence("```ts\nconst a = 1;\n```")).toBe("const a = 1;");
    expect(stripFence("Plain text")).toBe("Plain text");
  });

  it("asks for only the selection with its surroundings", () => {
    const content = "Intro paragraph.\n\nThe quick brown fox.\n\nOutro.";
    const start = content.indexOf("The quick");
    const { system, prompt } = editPrompt({
      content,
      language: "markdown",
      instruction: "Make it shorter",
      selection: { start, end: start + 20 },
    });
    expect(system).toContain("Rewrite only the SELECTION");
    expect(prompt).toContain("SELECTION (rewrite this):\nThe quick brown fox.");
    expect(prompt).toContain("TEXT BEFORE (unchanged):\nIntro paragraph.");
    expect(prompt).toContain("TEXT AFTER (unchanged):\n\n\nOutro.");
  });

  it("asks for the whole document when nothing is selected", () => {
    const { system, prompt } = editPrompt({
      content: "const a = 1;",
      language: "typescript",
      instruction: "Add types",
    });
    expect(system).toContain("return the complete updated document");
    expect(system).toContain("Keep the code's language");
    expect(prompt).toContain("DOCUMENT:\nconst a = 1;");
  });
});
