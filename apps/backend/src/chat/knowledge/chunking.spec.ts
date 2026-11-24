import { chunkPages, fullTextQuery } from "./chunking";
import {
  coverage,
  knowledgePrompt,
  type KnowledgeHit,
} from "./knowledge.service";

describe("knowledge chunking", () => {
  it("keeps page numbers for paged documents", () => {
    const passages = chunkPages(
      [
        "Introduction\n\nThis report covers the year.",
        "Revenue\n\nRevenue grew 12% to EUR 4.2 million.",
      ],
      true,
    );
    expect(passages.map((passage) => passage.page)).toEqual([1, 2]);
    expect(passages[1].text).toContain("EUR 4.2 million");
  });

  it("remembers the nearest heading", () => {
    const passages = chunkPages(
      [
        "# Pricing\n\n" +
          "Plans start at 10 dollars. ".repeat(60) +
          "\n\n# Termination\n\nEither party may terminate with 60 days notice.",
      ],
      false,
    );
    const last = passages[passages.length - 1];
    expect(last.heading).toBe("Termination");
    expect(last.text).toContain("60 days notice");
    expect(last.page).toBeNull();
    expect(passages[0].heading).toBe("Pricing");
  });

  it("splits long text into overlapping passages", () => {
    const text = Array.from(
      { length: 40 },
      (_, index) => `Sentence number ${index} explains a detail.`,
    ).join(" ");
    const passages = chunkPages([text], false);
    expect(passages.length).toBeGreaterThan(1);
    expect(passages.every((passage) => passage.text.length <= 1700)).toBe(true);
    expect(passages.map((passage) => passage.ordinal)).toEqual(
      passages.map((_, index) => index),
    );
  });

  it("builds prefix full-text queries without stop words", () => {
    expect(fullTextQuery("What is the termination notice period?")).toBe(
      "termination* notice* period*",
    );
    expect(fullTextQuery("Какой срок расторжения договора?")).toBe(
      "срок* расторжен* догово*",
    );
  });

  it("gives the model citation links it can copy", () => {
    const hit: KnowledgeHit = {
      n: 1,
      sourceId: 3,
      chunkId: 9,
      title: 'Contract "A".pdf',
      kind: "file",
      url: null,
      page: 4,
      heading: "Termination",
      text: "Either party may terminate with 60 days notice.",
      label: 'Contract "A".pdf, p. 4',
      link: "/knowledge/3?chunk=9",
    };
    const prompt = knowledgePrompt([hit]);
    expect(prompt).toContain(
      `[1](/knowledge/3?chunk=9 "Contract 'A'.pdf, p. 4")`,
    );
    expect(prompt).toContain("60 days notice");
    expect(knowledgePrompt([])).toBe("");
  });

  it("measures how much of a question a passage covers", () => {
    expect(
      coverage(
        "termination notice period",
        "Either party may terminate with notice. Termination period is 60 days.",
      ),
    ).toBe(1);
    expect(
      coverage(
        "Какой срок оплаты счетов?",
        "Invoices are payable within 30 days",
      ),
    ).toBe(0);
    expect(coverage("срок оплаты", "Оплата производится в срок")).toBe(1);
  });
});
