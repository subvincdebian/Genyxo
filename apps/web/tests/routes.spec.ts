import { test, expect } from "@playwright/test";
import { authenticate, mockApi } from "./fixtures";
const pages = [
  "/",
  "/index.html",
  "/chat.html",
  "/profile.html",
  "/notifications.html",
  "/support.html",
  "/dashboard.html",
  "/policies/policies.html",
  "/policies/privacy-policy.html",
  "/policies/terms-of-service.html",
  "/policies/faq.html",
];
for (const url of pages)
  test(`renders ${url} without runtime errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await authenticate(page);
    await mockApi(page);
    const response = await page.goto(url);
    await expect(page.locator("body")).not.toBeEmpty();
    await page.waitForTimeout(1000);
    await expect(
      page.getByRole("alert").filter({ hasText: "Unable to load this page" }),
    ).toHaveCount(0);
    expect(response?.status()).toBe(200);
    expect(errors).toEqual([]);
  });
test("admin access ignores forged cached role", async ({ page }) => {
  await authenticate(page, "admin");
  await page.route("**/api/**", (route) =>
    route.fulfill({ status: 403, json: { message: "Forbidden" } }),
  );
  await page.goto("/gate.html");
  await expect(
    page.getByRole("alert").filter({ hasText: "Access denied" }),
  ).toContainText("Access denied");
  await expect(page.locator("#usersTable")).toHaveCount(0);
});
test("authorized admin loads data after server authorization", async ({
  page,
}) => {
  await authenticate(page, "admin");
  await mockApi(page);
  await page.goto("/gate.html");
  await expect(page.locator("#usersTable")).toBeVisible();
  await expect(page.locator("#admin-loader")).toHaveCount(0);
});
