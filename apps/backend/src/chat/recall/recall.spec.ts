import { scoreMessage, searchTerms, snippetAround, timeRange } from "./recall";

describe("recall helpers", () => {
  const now = new Date(2026, 10, 24, 15, 0); // Tue 24 Nov 2026

  it("reads time spans in English and Russian", () => {
    expect(
      timeRange("what did we decide about payments last month?", now),
    ).toMatchObject({
      from: new Date(2026, 9, 1),
      to: new Date(2026, 10, 1),
      label: "last month",
    });
    expect(
      timeRange("что мы решили про оплату в прошлом месяце?", now).label,
    ).toBe("last month");
    expect(timeRange("вчера", now)).toMatchObject({
      from: new Date(2026, 10, 23),
      to: new Date(2026, 10, 24),
    });
    expect(timeRange("pricing 3 days ago", now).from).toEqual(
      new Date(2026, 10, 20),
    );
    expect(timeRange("pricing", now)).toEqual({});
  });

  it("keeps content words and stems Russian ones", () => {
    expect(searchTerms("что мы решили про оплату в прошлом месяце?")).toEqual([
      "опла",
    ]);
    expect(
      searchTerms("What did we decide about the Stripe payment plan?"),
    ).toEqual(["stripe", "payment", "plan"]);
    expect(searchTerms("договоренности по поставкам")).toEqual([
      "договореннос",
      "поставк",
    ]);
  });

  it("ranks messages with more matching terms higher", () => {
    const date = new Date(2026, 10, 1);
    expect(
      scoreMessage(
        "Stripe payment plan agreed",
        ["stripe", "payment"],
        date,
        now.getTime(),
      ),
    ).toBeGreaterThan(
      scoreMessage(
        "payment pending",
        ["stripe", "payment"],
        date,
        now.getTime(),
      ),
    );
    expect(scoreMessage("nothing here", ["stripe"], date)).toBe(0);
  });

  it("cuts a snippet around the match", () => {
    const text = `${"intro ".repeat(80)}We agreed on Stripe for payments.${" outro".repeat(80)}`;
    const snippet = snippetAround(text, ["stripe"], 120);
    expect(snippet).toContain("Stripe");
    expect(snippet.startsWith("…")).toBe(true);
  });
});

describe("recall snippets", () => {
  it("reads markdown links and emphasis as plain words", () => {
    expect(
      snippetAround(
        "As we discussed in [JWST launch](/c/abc?chat=1&m=2), it **launched** in 2021.",
        ["launched"],
      ),
    ).toBe("As we discussed in JWST launch, it launched in 2021.");
  });
});
