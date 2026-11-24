import { readPlan, runBrowserTool, agentPrompt } from "./agent-tools";

describe("agent tools", () => {
  it("normalizes the model's plan", () => {
    expect(
      readPlan({
        steps: [
          { title: " Open the site ", status: "done" },
          { title: "Fill the form", status: "weird" },
          { title: "" },
        ],
      }),
    ).toEqual([
      { title: "Open the site", status: "done", note: undefined },
      { title: "Fill the form", status: "pending", note: undefined },
    ]);
  });

  it("asks the user before a committing click", async () => {
    const browser = {
      sessionKey: () => "u1-c2",
      call: jest.fn().mockResolvedValue({
        needsConfirmation: true,
        reason: "“Submit order”",
        url: "https://shop.test/cart",
      }),
    };
    const proposeBuiltin = jest.fn().mockResolvedValue({
      output: { status: "awaiting_user_confirmation" },
      card: "card",
      actionId: "a1",
    });
    const outcome = await runBrowserTool(
      browser as any,
      { proposeBuiltin } as any,
      { userId: 1, conversationId: 2 },
      "browser_click",
      { ref: "13", label: "Submit order" },
    );
    expect(outcome.actionId).toBe("a1");
    expect(proposeBuiltin).toHaveBeenCalledWith(
      1,
      "browser",
      "browser_click",
      { session: "u1-c2", ref: "13" },
      expect.objectContaining({ title: "Click “Submit order”" }),
      { conversationId: 2 },
    );
  });

  it("never types secrets", async () => {
    const browser = { sessionKey: () => "s", call: jest.fn() };
    const outcome = await runBrowserTool(
      browser as any,
      undefined,
      { userId: 1, conversationId: 2 },
      "browser_type",
      { ref: "4", text: "1234", label: "Card number" },
    );
    expect(browser.call).not.toHaveBeenCalled();
    expect(outcome.output.error).toMatch(/never typed/);
  });

  it("tells the model about confirmations and secrets", () => {
    const prompt = agentPrompt(true);
    expect(prompt).toContain("browser_open");
    expect(prompt).toContain("Confirm");
    expect(prompt).toContain("passwords");
  });
});
