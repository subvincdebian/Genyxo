import { expect, test } from "@playwright/test";
import { mockApi, token } from "./fixtures";

test("reset request has a clear confirmation and can be repeated", async ({ page }) => {
  let requests = 0;
  await mockApi(page, async (route, path) => {
    if (path === "/auth/forgot-password") {
      requests++;
      await route.fulfill({ json: { message: "Sent" } });
      return true;
    }
    return false;
  });
  await page.goto("/sign-in?mode=forgot");
  await page.locator("#gx-auth-email").fill("person@example.com");
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible();
  await page.getByRole("button", { name: "Send another reset link" }).click();
  await expect.poll(() => requests).toBe(2);
});

test("Google is visible and optional providers only appear when configured", async ({ page }) => {
  await mockApi(page, async (route, path) => {
    if (path === "/auth/providers") {
      await route.fulfill({ json: { google: true, facebook: false } });
      return true;
    }
    return false;
  });
  await page.goto("/sign-in");
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with Facebook" })).toHaveCount(0);
});

test("Google explains when OAuth is not configured", async ({ page }) => {
  await mockApi(page, async (route, path) => {
    if (path === "/auth/providers") {
      await route.fulfill({ json: { google: false, facebook: false } });
      return true;
    }
    return false;
  });
  await page.goto("/sign-in");
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await expect(page.locator(".gx-auth-error")).toContainText("not connected yet");
});

test("Google explains when the auth service is unavailable", async ({ page }) => {
  await mockApi(page, async (route, path) => {
    if (path === "/auth/providers") {
      await route.fulfill({ status: 502, json: { message: "Backend unavailable" } });
      return true;
    }
    return false;
  });
  await page.goto("/sign-in");
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await expect(page.locator(".gx-auth-error")).toContainText("temporarily unavailable");
});

test("auth screen fits a narrow phone without horizontal scroll", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await mockApi(page);
  await page.goto("/sign-in");
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
});

test("registration validates each field and sends the display name", async ({ page }) => {
  let registration: Record<string, string> | undefined;
  await mockApi(page, async (route, path) => {
    if (path === "/auth/register") {
      registration = route.request().postDataJSON();
      await route.fulfill({ status: 201, json: { message: "Check your email" } });
      return true;
    }
    return false;
  });
  await page.goto("/sign-in?mode=signup");
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.locator("#gx-auth-name-error")).toHaveText("Enter your name.");
  await expect(page.locator("#gx-auth-email-error")).toHaveText("Enter your email address.");
  await expect(page.locator("#gx-auth-password-error")).toHaveText("Enter your password.");
  await expect(page.locator("#gx-auth-confirmPassword-error")).toHaveText("Confirm your password.");
  await page.locator("#gx-auth-name").fill(" ");
  await page.locator("#gx-auth-email").fill("not-an-email");
  await page.locator("#gx-auth-password").fill("short");
  await page.locator("#gx-auth-confirm").fill("different");
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.locator("#gx-auth-name-error")).toHaveText("Enter your name.");
  await expect(page.locator("#gx-auth-email-error")).toHaveText("Enter a valid email address.");
  await expect(page.locator("#gx-auth-password-error")).toHaveText("Use at least 8 characters.");
  await expect(page.locator("#gx-auth-confirmPassword-error")).toHaveText("Passwords do not match.");
  await page.locator("#gx-auth-name").fill("Ada Lovelace");
  await page.locator("#gx-auth-email").fill("ada@example.com");
  await page.locator("#gx-auth-password").fill("LongPassword123!");
  await page.locator("#gx-auth-confirm").fill("Different123!");
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.locator("#gx-auth-confirmPassword-error")).toHaveText("Passwords do not match.");
  await page.locator("#gx-auth-confirm").fill("LongPassword123!");
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible();
  expect(registration).toEqual({ name: "Ada Lovelace", email: "ada@example.com", password: "LongPassword123!" });
});

test("registration offers resend if the account was saved but email delivery failed", async ({ page }) => {
  let resendCount = 0;
  await mockApi(page, async (route, path) => {
    if (path === "/auth/register") {
      await route.fulfill({ status: 503, json: { message: "Account created, but the verification email could not be sent. Please request another email." } });
      return true;
    }
    if (path === "/auth/resend-verification") {
      resendCount++;
      await route.fulfill({ json: { message: "Sent" } });
      return true;
    }
    return false;
  });
  await page.goto("/sign-in?mode=signup");
  await page.locator("#gx-auth-name").fill("Ada Lovelace");
  await page.locator("#gx-auth-email").fill("ada@example.com");
  await page.locator("#gx-auth-password").fill("LongPassword123!");
  await page.locator("#gx-auth-confirm").fill("LongPassword123!");
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible();
  await expect(page.locator(".gx-auth-error")).toContainText("account was created");
  await page.getByRole("button", { name: "Resend verification email" }).click();
  expect(resendCount).toBe(1);
});

test("server-side registration validation appears beside the affected field", async ({ page }) => {
  await mockApi(page, async (route, path) => {
    if (path === "/auth/register") {
      await route.fulfill({ status: 400, json: { message: ["Invalid email format."] } });
      return true;
    }
    return false;
  });
  await page.goto("/sign-in?mode=signup");
  await page.locator("#gx-auth-name").fill("Ada");
  await page.locator("#gx-auth-email").fill("ada@example.com");
  await page.locator("#gx-auth-password").fill("LongPassword123!");
  await page.locator("#gx-auth-confirm").fill("LongPassword123!");
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.locator("#gx-auth-email-error")).toHaveText("Enter a valid email address.");
});

test("registration footer stays visible at a common laptop height", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await mockApi(page);
  await page.goto("/sign-in?mode=signup");
  await expect(page.getByRole("button", { name: "Back to sign in" })).toBeInViewport();
  await expect(page.getByRole("link", { name: "Privacy Policy" })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(768);
});

test("registration footer stays visible on a standard phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockApi(page);
  await page.goto("/sign-in?mode=signup");
  await expect(page.getByRole("button", { name: "Back to sign in" })).toBeInViewport();
  await expect(page.getByRole("link", { name: "Privacy Policy" })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(844);
});

test("password visibility toggle uses an accessible icon button", async ({ page }) => {
  await mockApi(page);
  await page.goto("/sign-in");
  await page.locator("#gx-auth-password").fill("secret123");
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(page.locator("#gx-auth-password")).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Hide password" }).click();
  await expect(page.locator("#gx-auth-password")).toHaveAttribute("type", "password");
  await expect(page.getByRole("button", { name: "Forgot password?" })).toBeVisible();
});

test("OAuth callback consumes the fragment and restores the intended page", async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("authReturnTo", "/chat"));
  await mockApi(page);
  await page.goto(`/sign-in#auth-token=${token}`);
  await expect(page).toHaveURL(/\/chat$/);
  expect(await page.evaluate(() => localStorage.getItem("authToken"))).toBe(token);
  expect(new URL(page.url()).hash).toBe("");
});

test("Google callback rejects a missing OAuth state", async ({ request }) => {
  const response = await request.get("/auth/google/callback?code=unexpected", { maxRedirects: 0 });
  expect(response.status()).toBe(302);
  expect(response.headers().location).toContain("/sign-in?oauth_error=1");
});
