import {
  checkableText,
  parseJsonObject,
  scoreClaims,
} from "./fact-check.service";
import type { CheckedClaim } from "./fact-check.types";

const claim = (verdict: CheckedClaim["verdict"]): CheckedClaim => ({
  id: verdict,
  quote: "",
  claim: "",
  verdict,
  confidence: 1,
  explanation: "",
  sources: [],
});

describe("fact-check helpers", () => {
  it("parses JSON wrapped in fences and chatter", () => {
    expect(parseJsonObject('Sure!\n```json\n{"claims":[]}\n```')).toEqual({
      claims: [],
    });
    expect(parseJsonObject("no json here")).toBeNull();
  });

  it("drops code and cards from the text to check", () => {
    const text = checkableText(
      'Paris is the capital.\n```genyxo-sources\n{"sources":[]}\n```\nSee [docs](https://x.y).',
    );
    expect(text).not.toContain("genyxo");
    expect(text).toContain("See docs.");
  });

  it("scores supported claims fully and false ones at zero", () => {
    const { counts, score } = scoreClaims([
      claim("supported"),
      claim("false"),
      claim("unverified"),
      claim("disputed"),
    ]);
    expect(counts).toEqual({
      supported: 1,
      disputed: 1,
      false: 1,
      unverified: 1,
    });
    expect(score).toBe(Math.round(((1 + 0 + 0.5 + 0.25) / 4) * 100));
  });
});

describe("nameSources", () => {
  const { nameSources } = jest.requireActual("./fact-check.service");
  const results = [
    { url: "https://en.wikipedia.org/wiki/JWST" },
    { url: "https://science.nasa.gov/webb" },
  ];
  it("handles bare numbers too", () => {
    expect(nameSources("Source 1 mentions it.", results)).toBe(
      "Wikipedia mentions it.",
    );
  });
  it("names numbered sources by their site", () => {
    expect(
      nameSources("Source [2] confirms it, and [1] agrees.", results),
    ).toBe("NASA confirms it, and (Wikipedia) agrees.");
  });
});

describe("relevantPassages", () => {
  const { relevantPassages } = jest.requireActual("./fact-check.service");
  it("keeps the sentences about the claim", () => {
    const page =
      "Cookies help us improve the site. The telescope launched on an Ariane 5 rocket from Kourou in December 2021. Subscribe to our newsletter today.";
    expect(
      relevantPassages(
        page,
        "The telescope launched aboard an Ariane 5 rocket",
      ),
    ).toBe(
      "The telescope launched on an Ariane 5 rocket from Kourou in December 2021.",
    );
  });
});
