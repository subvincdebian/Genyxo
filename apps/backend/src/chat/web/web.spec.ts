import { deepResearch, parseQueries, pickPages } from "./deep-research";
import { runMemoryTool } from "./memory-tools";
import { describeWebFences, runWebTool, sourcesFence } from "./web-tools";
import {
  htmlToText,
  isPrivateAddress,
  WebSearchService,
} from "./web-search.service";

describe("web search service", () => {
  it("reads DuckDuckGo lite results and skips ads", async () => {
    const html = `
      <a rel="nofollow" href="//duckduckgo.com/y.js?ad_domain=ads.example&amp;uddg=https%3A%2F%2Fads.example%2F" class='result-link'>Ad</a>
      <td class='result-snippet'>Buy now</td>
      <a rel="nofollow" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fnextjs.org%2Fblog&amp;rut=1" class='result-link'>Next.js <b>Blog</b></a>
      <td class='result-snippet'>The latest &amp; greatest</td>`;
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(new Response(html, { status: 200 }));
    const service = new WebSearchService({ get: () => undefined } as any);
    const results = await service.search("nextjs blog", 5);
    expect(results).toEqual([
      {
        title: "Next.js Blog",
        url: "https://nextjs.org/blog",
        snippet: "The latest & greatest",
      },
    ]);
    fetchMock.mockRestore();
  });

  it("turns HTML into readable text, preferring the article", () => {
    const { title, text } = htmlToText(
      `<html><head><title>Guide &amp; tips</title><script>bad()</script></head><body><nav>Menu</nav><article>${"<p>Useful paragraph about routing.</p>".repeat(40)}</article><footer>Footer</footer></body></html>`,
    );
    expect(title).toBe("Guide & tips");
    expect(text).toContain("Useful paragraph about routing.");
    expect(text).not.toMatch(/Menu|Footer|bad\(\)/);
  });

  it("refuses private and loopback addresses", async () => {
    expect(
      [
        "127.0.0.1",
        "10.1.2.3",
        "192.168.0.10",
        "172.20.0.5",
        "169.254.169.254",
        "::1",
        "fd00::1",
      ].every(isPrivateAddress),
    ).toBe(true);
    expect(isPrivateAddress("93.184.216.34")).toBe(false);
    const service = new WebSearchService({ get: () => undefined } as any);
    await expect(service.read("http://127.0.0.1:3000/admin")).rejects.toThrow(
      "not allowed",
    );
    await expect(service.read("file:///etc/passwd")).rejects.toThrow("http");
  });
});

describe("web tools", () => {
  it("collects the pages read as sources and summarises them for later turns", async () => {
    const service = {
      read: jest.fn().mockResolvedValue({
        title: "Next.js 16",
        url: "https://nextjs.org/blog/next-16",
        text: "Released.",
      }),
    } as any;
    const sources: { title: string; url: string }[] = [];
    const output = await runWebTool(
      service,
      "genyxo_read_page",
      { url: "https://nextjs.org/blog/next-16" },
      sources,
    );
    expect(output).toEqual(
      expect.objectContaining({ title: "Next.js 16", text: "Released." }),
    );
    expect(sources).toEqual([
      { title: "Next.js 16", url: "https://nextjs.org/blog/next-16" },
    ]);
    expect(describeWebFences(`Done.${sourcesFence(sources)}`)).toBe(
      "Done.\n\n[Sources: https://nextjs.org/blog/next-16]\n",
    );
  });
});

describe("deep research", () => {
  it("parses planned queries from JSON or loose lines", () => {
    expect(
      parseQueries('```json\n{"queries": ["a b", "c d", "a b"]}\n```', "q"),
    ).toEqual(["a b", "c d"]);
    expect(
      parseQueries("1. first query here\n2. second query here", "q"),
    ).toEqual(["first query here", "second query here"]);
    expect(parseQueries("", "fallback")).toEqual(["fallback"]);
  });

  it("reads one page per site", () => {
    const results = [
      { url: "https://a.com/1" },
      { url: "https://a.com/2" },
      { url: "https://b.com/1" },
    ] as any;
    expect(
      pickPages(results, new Set(), 5).map((result) => result.url),
    ).toEqual(["https://a.com/1", "https://b.com/1"]);
  });

  it("plans, searches, reads and writes a sourced report, narrating each step", async () => {
    const steps: string[] = [];
    let report = "";
    const search = {
      search: jest.fn().mockResolvedValue([
        { title: "A", url: "https://a.com/x", snippet: "a" },
        { title: "B", url: "https://b.com/y", snippet: "b" },
      ]),
      read: jest.fn(async (url: string) => ({
        title: url,
        url,
        text: `Facts from ${url} `.repeat(20),
      })),
    } as any;
    const sources = await deepResearch({
      question: "Is C++26 out?",
      search,
      signal: new AbortController().signal,
      step: (step) => {
        steps.push(step);
      },
      complete: jest
        .fn()
        .mockResolvedValueOnce(
          '{"queries": ["C++26 status", "C++26 features"]}',
        )
        .mockResolvedValueOnce('{"queries": []}'),
      stream: async (_system, prompt) => {
        report = prompt;
      },
    });
    expect(steps).toEqual([
      "Planning the research",
      "Searching “C++26 status”",
      "Searching “C++26 features”",
      "Reading a.com",
      "Reading b.com",
      "Looking for gaps",
      "Writing the report",
    ]);
    expect(sources.map((source) => source.url)).toEqual([
      "https://a.com/x",
      "https://b.com/y",
    ]);
    expect(report).toContain("[1] https://a.com/x");
  });
});

describe("memory tools", () => {
  const workspace = () => ({
    listMemory: jest
      .fn()
      .mockResolvedValue({ items: [{ id: 3, content: "Lives in Kyiv" }] }),
    saveMemory: jest.fn().mockResolvedValue({}),
    deleteRecord: jest.fn().mockResolvedValue({}),
  });

  it("remembers a new fact once and shows the Memory updated pill", async () => {
    const store = workspace();
    const saved = await runMemoryTool(store as any, 7, "genyxo_remember", {
      fact: "Writes C++ in CLion",
    });
    expect(store.saveMemory).toHaveBeenCalledWith(7, {
      content: "Writes C++ in CLion",
      projectId: null,
    });
    expect(saved.markdown).toContain('"action":"saved"');
    const again = await runMemoryTool(store as any, 7, "genyxo_remember", {
      fact: "lives in kyiv",
    });
    expect(again.output).toEqual({ saved: false, note: "Already remembered" });
  });

  it("keeps a project chat's memory inside its project", async () => {
    const store = workspace();
    await runMemoryTool(
      store as any,
      7,
      "genyxo_remember",
      { fact: "Ships on Fridays" },
      12,
    );
    expect(store.listMemory).toHaveBeenCalledWith(7, 12);
    expect(store.saveMemory).toHaveBeenCalledWith(7, {
      content: "Ships on Fridays",
      projectId: 12,
    });
    await runMemoryTool(
      store as any,
      7,
      "genyxo_forget",
      { about: "Kyiv" },
      12,
    );
    expect(store.listMemory).toHaveBeenLastCalledWith(7, 12);
  });

  it("forgets matching facts", async () => {
    const store = workspace();
    const result = await runMemoryTool(store as any, 7, "genyxo_forget", {
      about: "Kyiv",
    });
    expect(store.deleteRecord).toHaveBeenCalledWith(7, "memory", 3);
    expect(result.output).toEqual({ forgotten: 1 });
  });
});
