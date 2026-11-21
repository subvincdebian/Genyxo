import { summarizeUsage } from "./profile-usage";

describe("account usage", () => {
  it("fills UTC days and totals only approved ledger spending", () => {
    const result = summarizeUsage(
      [
        { day: "2026-10-27", credits: "12", requests: "2" },
        { day: "2026-10-28", credits: "3", requests: "1" },
      ],
      new Date("2026-10-26T00:00:00Z"),
      3,
    );
    expect(result.totalCredits).toBe(15);
    expect(result.requests).toBe(3);
    expect(result.days).toEqual([
      { date: "2026-10-26", credits: 0, requests: 0 },
      { date: "2026-10-27", credits: 12, requests: 2 },
      { date: "2026-10-28", credits: 3, requests: 1 },
    ]);
  });
  it("returns honest zero usage across a year boundary", () => {
    const result = summarizeUsage([], new Date("2025-12-31T00:00:00Z"), 2);
    expect(result.totalCredits).toBe(0);
    expect(result.days.map((day) => day.date)).toEqual([
      "2025-12-31",
      "2026-01-01",
    ]);
  });
});
