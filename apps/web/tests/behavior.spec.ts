import { test, expect } from "@playwright/test";
import { authenticate, mockApi, user, token } from "./fixtures";

test("admin preserves populated table cells, pagination and sanitized user content", async ({
  page,
}) => {
  await authenticate(page, "admin");
  await mockApi(page, async (route, path) => {
    if (path === "/profile") {
      await route.fulfill({ json: { ...user, role: "admin" } });
      return true;
    }
    if (path.endsWith("/users")) {
      const currentPage = Number(
        new URL(route.request().url()).searchParams.get("page"),
      );
      await route.fulfill({
        json: {
          data: [
            {
              ...user,
              id: currentPage,
              name: 'Table user <img src=x onerror="window.__unsafe=true">',
            },
          ],
          meta: { page: currentPage, lastPage: 2, total: 2 },
        },
      });
      return true;
    }
    if (path.endsWith("/transactions")) {
      await route.fulfill({
        json: {
          data: [
            {
              id: 21,
              user,
              amount: 9.99,
              creditsAmount: 2000,
              status: "APPROVED",
              provider: "NOWPAYMENTS",
              type: "PURCHASE",
              createdAt: "2026-10-09T09:00:00Z",
            },
          ],
          meta: { page: 1, lastPage: 1, total: 1 },
        },
      });
      return true;
    }
    return false;
  });
  await page.goto("/admin");
  await expect(page.locator("#usersTable tr")).toHaveCount(1);
  await expect(page.locator("#usersTable td")).toHaveCount(6);
  await expect(page.locator("#usersTable")).toContainText("Table user");
  await expect(page.locator("#transactionsTable td")).toHaveCount(7);
  await expect(page.locator("#usersTable [onerror]")).toHaveCount(0);
  expect(
    await page.evaluate(() => Reflect.get(window, "__unsafe")),
  ).toBeUndefined();
  await page.locator("#nextUserBtn").click();
  await expect(page.locator("#usersTable td").first()).toHaveText("#2");
  await expect(page.locator("#nextUserBtn")).toBeDisabled();
});

test("catalogue, checkout, guest authentication forms and search actions", async ({
  page,
}) => {
  await mockApi(page);
  await page.goto("/");
  await expect(page.locator(".product-card")).toHaveCount(6);
  await page.locator(".buy-btn").first().click();
  await expect(page.locator("#checkoutModal")).toBeVisible();
  await expect(page.locator("#checkoutName")).toHaveText("Start AI");
  await expect(page.locator("#checkoutCredits")).toHaveText("750");
  await page.locator("#closeCheckout").click();
  await page.locator("#loginBtn").click();
  await expect(page.locator("#loginForm")).toBeVisible();
  await page.locator("#showSignup").click();
  await expect(page.locator("#signupForm")).toBeVisible();
  await page.locator("#showLogin").click();
  await expect(page.locator("#loginForm")).toBeVisible();
  await page.locator("#closeLogin").click();
  await page.locator(".search-input").fill("Gemini");
  await expect(page.locator("#searchResultsDropdown")).toBeVisible();
});

test("checkout uses the language dictionary and supports older translated credit labels", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("appLang", "uk"));
  await mockApi(page);
  await page.goto("/");
  await expect(page.locator(".product-card")).toHaveCount(6);
  await expect(page.locator("#productsGrid")).not.toContainText("undefined");
  await page.locator('.buy-btn[data-id="6"]').click();
  await expect(page.locator("#checkoutName")).toHaveText("AI Titan");
  await expect(page.locator("#checkoutCredits")).toHaveText(/^\d+$/);
});

test("chat preserves SSE contract, Markdown sanitization, history and balance", async ({
  page,
}) => {
  await authenticate(page);
  let payload: unknown;
  await mockApi(page, async (route, path) => {
    if (path !== "/chat/stream") return false;
    payload = route.request().postDataJSON();
    const events = [
      {
        status: "conversation",
        conversationId: 42,
        conversationTitle: "Test conversation",
      },
      {
        token: 'Hello **React** <img src=x onerror="window.__unsafe=true">',
        conversationId: 42,
      },
      { status: "done", messageId: 11, creditBalance: 149 },
    ];
    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: events
        .map((event) => "data: " + JSON.stringify(event) + "\n\n")
        .join(""),
    });
    return true;
  });
  await page.goto("/chat.html");
  await expect(page.locator("#userInput")).toBeEnabled();
  await page.locator("#fileInput").setInputFiles({
    name: "example.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Attachment content"),
  });
  await page.locator("#userInput").fill("Test message");
  await page.locator("#sendBtn").click();
  await expect(page.locator("#chatBox")).toContainText("Hello React");
  await expect(page.locator("#historyList")).toContainText("Test conversation");
  await expect(page).toHaveURL(/id=42/);
  expect(payload).toMatchObject({
    message: "Test message",
    files: [
      {
        name: "example.txt",
        mime_type: "text/plain",
        size: 18,
        data: Buffer.from("Attachment content").toString("base64"),
      },
    ],
  });
  expect(
    await page.evaluate(() => Reflect.get(window, "__unsafe")),
  ).toBeUndefined();
  expect(await page.evaluate(() => localStorage.getItem("userCredits"))).toBe(
    "149",
  );
});

test("login establishes one session and checkout uses its current Bearer token", async ({
  page,
}) => {
  let loginRequests = 0;
  let paymentHeader: string | undefined;
  let paymentBody: unknown;
  await mockApi(page, async (route, path) => {
    if (path === "/auth/login") {
      loginRequests++;
      expect(route.request().postDataJSON()).toEqual({
        email: user.email,
        password: "FixturePassword1!",
      });
      await route.fulfill({ json: { access_token: token, user } });
      return true;
    }
    if (path === "/payment/buy") {
      paymentHeader = route.request().headers().authorization;
      paymentBody = route.request().postDataJSON();
      await route.fulfill({
        status: 500,
        json: { message: "Fixture failure" },
      });
      return true;
    }
    return false;
  });
  await page.goto("/");
  await page.locator("#loginBtn").click();
  await page.locator("#loginEmail").fill(user.email);
  await page.locator("#loginPassword").fill("FixturePassword1!");
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(page.locator("#loginModal")).not.toBeVisible();
  await expect(page.locator("#navUsername")).toHaveText(user.name);
  expect(loginRequests).toBe(1);
  await page.evaluate(() => window.AppI18n?.changeLanguage("uk"));
  await expect(page.locator("#navUsername")).toHaveText(user.name);
  await page.locator(".buy-btn").first().click();
  await page.locator("#payBtn").click();
  await expect(page.locator("#payBtn")).toBeEnabled();
  expect(paymentHeader).toBe("Bearer " + token);
  expect(paymentBody).toEqual({ packId: 1 });
});

test("registration opens verification only on success and includes the referral DTO", async ({
  page,
}) => {
  let status = 409;
  let registrationBody: unknown;
  await page.addInitScript(() =>
    localStorage.setItem("pending_referral_code", "REFERRAL"),
  );
  await mockApi(page, async (route, path) => {
    if (path !== "/auth/register") return false;
    registrationBody = route.request().postDataJSON();
    await route.fulfill({
      status,
      json: {
        message:
          status === 201
            ? "Registration successful. Please check your email to verify."
            : "User with this email already exists.",
      },
    });
    return true;
  });
  await page.goto("/");
  await page.locator("#loginBtn").click();
  await page.locator("#showSignup").click();
  await page.locator("#signupName").fill(user.name);
  await page.locator("#signupEmail").fill(user.email);
  await page.locator("#signupPassword").fill("FixturePassword1!");
  await page.locator("#signupConfirmPassword").fill("FixturePassword1!");
  await page.getByRole("button", { name: "Register", exact: true }).click();
  await expect(page.locator("#toast-container")).toContainText(
    "already exists",
  );
  await expect(page.locator("#verifyEmailModal")).not.toBeVisible();
  status = 201;
  await page.getByRole("button", { name: "Register", exact: true }).click();
  await expect(page.locator("#verifyEmailModal")).toBeVisible();
  expect(registrationBody).toEqual({
    name: user.name,
    email: user.email,
    password: "FixturePassword1!",
    referralCode: "REFERRAL",
  });
});

test("dismissed verification cannot establish a session from a pending poll", async ({
  page,
}) => {
  let requested = false;
  let release = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await mockApi(page, async (route, path) => {
    if (path === "/auth/register") {
      await route.fulfill({
        status: 201,
        json: { message: "Check your email" },
      });
      return true;
    }
    if (path === "/auth/login") {
      requested = true;
      await pending;
      await route
        .fulfill({ json: { access_token: token, user } })
        .catch(() => {});
      return true;
    }
    return false;
  });
  await page.goto("/");
  await page.locator("#loginBtn").click();
  await page.locator("#showSignup").click();
  await page.clock.install();
  await page.locator("#signupName").fill(user.name);
  await page.locator("#signupEmail").fill(user.email);
  await page.locator("#signupPassword").fill("FixturePassword1!");
  await page.locator("#signupConfirmPassword").fill("FixturePassword1!");
  await page.getByRole("button", { name: "Register", exact: true }).click();
  await expect(page.locator("#verifyEmailModal")).toBeVisible();
  try {
    await page.clock.runFor(7000);
    await expect.poll(() => requested).toBe(true);
    await page.locator("#verifyEmailModal").click({ position: { x: 5, y: 5 } });
    await expect(page.locator("#verifyEmailModal")).not.toBeVisible();
  } finally {
    release();
  }
  await page.clock.runFor(100);
  expect(
    await page.evaluate(() => localStorage.getItem("authToken")),
  ).toBeNull();
});

test("notifications stay unread on failed mutation and accept safe realtime text", async ({
  page,
}) => {
  await authenticate(page);
  const item = {
    id: 1,
    title: "Welcome",
    message: "Message",
    type: "INFO",
    isRead: false,
    createdAt: "2026-10-09T08:00:00Z",
  };
  await mockApi(page, async (route, path) => {
    if (path === "/notifications") {
      await route.fulfill({ json: [item] });
      return true;
    }
    if (path === "/notifications/1/read") {
      await route.fulfill({ status: 500, json: { message: "Failure" } });
      return true;
    }
    return false;
  });
  await page.goto("/notifications.html");
  await page.locator(".notif-card").click();
  await expect(page.locator(".notif-card")).toHaveClass(/unread/);
  await expect(page.locator("#notifList").getByRole("alert")).toContainText(
    "Failed",
  );
  await page.evaluate(() =>
    document.dispatchEvent(
      new CustomEvent("genyxo:notification", {
        detail: {
          id: 2,
          title: "<img src=x onerror=alert(1)>",
          message: "Safe text",
          type: "SUPPORT",
          createdAt: "2026-10-09T09:00:00Z",
        },
      }),
    ),
  );
  await expect(page.locator(".notif-card")).toHaveCount(2);
  await expect(page.locator(".notif-card img")).toHaveCount(0);
});

test("support sends the current DTO and preserves a draft on server failure", async ({
  page,
}) => {
  await authenticate(page);
  let fail = true;
  let payload: unknown;
  await mockApi(page, async (route, path) => {
    if (path !== "/support/create") return false;
    payload = route.request().postDataJSON();
    await route.fulfill({ status: fail ? 500 : 201, json: { id: 3 } });
    return true;
  });
  await page.goto("/support.html");
  await page.locator("#ticketSubject").fill("Payment issue");
  await page.locator("#ticketMessage").fill("Please check my payment.");
  await page.locator("#ticketPriority").selectOption("HIGH");
  await page.getByRole("button", { name: "Submit Ticket" }).click();
  await expect(
    page.locator("#createTicketForm").getByRole("alert"),
  ).toContainText("Error");
  await expect(page.locator("#ticketSubject")).toHaveValue("Payment issue");
  fail = false;
  await page.getByRole("button", { name: "Submit Ticket" }).click();
  await expect(page.locator("#ticketSubject")).toHaveValue("");
  expect(payload).toEqual({
    subject: "Payment issue",
    message: "Please check my payment.",
    priority: "HIGH",
  });
});

test("React language switch preserves form drafts and handles failed dictionaries", async ({
  page,
}) => {
  await authenticate(page);
  await mockApi(page);
  await page.goto("/support.html");
  await page.locator("#ticketSubject").fill("Saved draft");
  await page.evaluate(() => window.AppI18n?.changeLanguage("uk"));
  await expect(page.locator("html")).toHaveAttribute("lang", "uk");
  await expect(page.locator("#ticketSubject")).toHaveValue("Saved draft");
  await page.route("**/locales/de.json", (route) =>
    route.fulfill({ status: 500, body: "Unavailable" }),
  );
  await page.evaluate(() => window.AppI18n?.changeLanguage("de"));
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("#ticketSubject")).toHaveValue("Saved draft");
});

test("policy mobile menu opens and closes without missing DOM references", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/policies/privacy-policy.html");
  await page.locator("#toggleMobileMenu").click();
  await expect(page.locator("#mobileSidebar")).toHaveClass(/active/);
  await page.locator("#sidebar-overlay").click({ position: { x: 380, y: 400 } });
  await expect(page.locator("#mobileSidebar")).not.toHaveClass(/active/);
});
