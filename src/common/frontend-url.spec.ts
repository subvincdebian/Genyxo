import { frontendUrl } from "./frontend-url";
describe("Next.js public URLs", () => {
  const previous = process.env.FRONTEND_URL;
  afterEach(() => {
    if (previous === undefined) delete process.env.FRONTEND_URL;
    else process.env.FRONTEND_URL = previous;
  });
  it("keeps the existing public domain as the default", () => {
    delete process.env.FRONTEND_URL;
    expect(frontendUrl("/#success").href).toBe("https://genyxo.com/#success");
  });
  it("routes local returns to Next and encodes tokens", () => {
    process.env.FRONTEND_URL = "http://localhost:3001/";
    const target = frontendUrl();
    target.searchParams.set("token", "a+b&c");
    expect(target.origin).toBe("http://localhost:3001");
    expect(target.searchParams.get("token")).toBe("a+b&c");
    expect(frontendUrl("/admin").href).toBe("http://localhost:3001/admin");
  });
  it.each([
    "javascript:alert(1)",
    "https://name:password@example.test",
    "https://example.test/?secret=x",
    "https://example.test/#fragment",
  ])("rejects an unsafe configured base %s", (base) => {
    process.env.FRONTEND_URL = base;
    expect(() => frontendUrl()).toThrow("FRONTEND_URL");
  });
});
