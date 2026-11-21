import { selectProjectFileContext } from "./project-fragments";

describe("Project file context selection", () => {
  it("retrieves relevant content beyond the first six thousand characters", () => {
    const file = {
      name: "decisions.txt",
      extracted_text: `${"Unrelated background. ".repeat(650)}\nThe launch codename is Aurora and its release date is November.`,
    };
    const context = selectProjectFileContext(
      [file],
      "What is the Aurora release date?",
      5000,
    );
    expect(context.text).toContain("launch codename is Aurora");
    expect(context.sources).toEqual(["decisions.txt"]);
    expect(context.text.length).toBeLessThanOrEqual(5000);
    expect(context.limited).toBe(true);
  });
  it("does not claim unused files as sources and safely serializes their names", () => {
    const context = selectProjectFileContext(
      [
        {
          name: 'budget"</shared_file>.txt',
          extracted_text: "The approved budget is 42 units.",
        },
        { name: "empty.txt" },
      ],
      "budget",
      1000,
    );
    expect(context.sources).toHaveLength(1);
    expect(context.sources).not.toContain("empty.txt");
    expect(() => JSON.parse(context.text.split("\n")[0])).not.toThrow();
  });
  it("gives multiple files context when the user has not specified a query", () => {
    const context = selectProjectFileContext(
      [
        { name: "a.txt", extracted_text: "Alpha ".repeat(1500) },
        { name: "b.txt", extracted_text: "Beta summary" },
      ],
      "",
      4000,
    );
    expect(context.sources).toEqual(["a.txt", "b.txt"]);
  });
});
