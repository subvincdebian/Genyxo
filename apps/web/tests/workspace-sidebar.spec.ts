import { expect, test } from "@playwright/test";
import { authenticate, mockApi } from "./fixtures";
import type { WorkspaceConversation, WorkspacePreferences } from "../src/fsd/features/workspace/model/types";
import {
  calendarDay,
  groupSidebarConversations,
} from "../src/fsd/widgets/workspace/model/sidebar-groups";

test("calendar groups use local dates across DST and metadata timestamps", () => {
  const base = {
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-10-17T08:00:00Z",
  };
  const labels = {
    today: "Today",
    yesterday: "Yesterday",
    week: "Week",
    month: "Month",
  };
  const groups = groupSidebarConversations(
    [
      {
        ...base,
        id: 1,
        title: "Renamed old chat",
        lastActivityAt: "2026-10-15T10:00:00Z",
      },
      {
        ...base,
        id: 2,
        title: "Late yesterday",
        lastActivityAt: "2026-10-16T20:00:00Z",
      },
      {
        ...base,
        id: 3,
        title: "Local today",
        lastActivityAt: "2026-10-16T22:30:00Z",
      },
    ],
    "activity",
    "en",
    "Europe/Kyiv",
    labels,
    new Date("2026-10-17T10:00:00Z"),
  );
  expect(
    groups.map((group) => [group.key, group.items.map((item) => item.id)]),
  ).toEqual([
    ["today", [3]],
    ["yesterday", [2]],
    ["week", [1]],
  ]);
  expect(
    calendarDay(new Date("2026-11-01T05:30:00Z"), "America/New_York"),
  ).toBe(calendarDay(new Date("2026-11-01T06:30:00Z"), "America/New_York"));
  expect(
    groupSidebarConversations(
      [
        { ...base, id: 1, title: "Zulu" },
        { ...base, id: 2, title: "Alpha" },
      ],
      "name",
      "en",
      "UTC",
      labels,
    ).map((group) => group.items.map((item) => item.title)),
  ).toEqual([["Alpha", "Zulu"]]);
});

test.beforeEach(async ({ page }) => {
  await authenticate(page);
  let conversation: WorkspaceConversation = {id: 31, title: "Research notes", projectId: null, pinnedAt: null, archivedAt: null, createdAt: "2026-10-16T10:00:00Z", updatedAt: "2026-10-16T10:00:00Z", lastActivityAt: "2026-10-16T10:00:00Z"};
  let preferences: WorkspacePreferences = {grouping: "projects", sort: "activity", showProjects: true, timezone: "Europe/Kyiv", libraryView: "grid"};
  await mockApi(page, async (route, path) => {
    if (path === "/chat/workspace") {
      await route.fulfill({
        json: {
          conversations: conversation.archivedAt ? [] : [conversation],
          projects: [{ id: 5, name: "Research", instructions: "", files: [] }],
          preferences,
          capabilities: { chatSharing: false },
        },
      });
      return true;
    }
    if (
      path === "/chat/workspace/conversations/31" &&
      route.request().method() === "PATCH"
    ) {
      const patch = route.request().postDataJSON();
      conversation = {...conversation, ...patch, ...(patch.pinned !== undefined ? {pinnedAt: patch.pinned ? "2026-10-17T10:00:00Z" : null} : {}), ...(patch.archived !== undefined ? {archivedAt: patch.archived ? "2026-10-17T10:00:00Z" : null} : {})};
      await route.fulfill({ json: conversation });
      return true;
    }
    if (
      path === "/chat/workspace/preferences" &&
      route.request().method() === "PATCH"
    ) {
      preferences = {...preferences, ...route.request().postDataJSON()};
      await route.fulfill({ json: preferences });
      return true;
    }
    if (path === "/chat/workspace/conversations" && route.request().method() === "GET") {
      await route.fulfill({json: {items: conversation.archivedAt ? [conversation] : [], hasMore: false}});
      return true;
    }
    return false;
  });
});

test("pin, move and preferences update the real API and restore section ownership", async ({page}) => {
  await page.goto("/chat");
  const row = page.locator('[data-workspace-chat="31"]');
  await row.getByRole("button", {name: "Pin", exact: true}).click();
  await expect(page.getByRole("region", {name: "Pinned", exact: true}).locator('[data-workspace-chat="31"]')).toBeVisible();
  await row.getByRole("button", {name: "Unpin", exact: true}).click();
  await row.click({button: "right"});
  await page.getByRole("menuitem", {name: "Move to project", exact: true}).click();
  await page.getByRole("menuitem", {name: "Research", exact: true}).click();
  await page.getByRole("button", {name: "Expand sidebar: Research", exact: true}).click();
  await expect(page.locator("#workspace-project-chats-5").locator('[data-workspace-chat="31"]')).toBeVisible();
  await page.getByRole("button", {name: "Sidebar settings", exact: true}).click();
  await page.getByRole("menuitem", {name: "Organize sidebar", exact: true}).click();
  await page.getByRole("menuitemradio", {name: "In one list", exact: true}).click();
  await expect(page.getByRole("menuitemradio", {name: "In one list", exact: true})).toHaveAttribute("aria-checked", "true");
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await expect(page.locator(".ws-sidebar-recent").locator('[data-workspace-chat="31"]')).toBeVisible();
});

test("project accordion persists by user across reload", async ({page}) => {
  await page.goto("/chat");
  await page.getByRole("button", {name: "Expand sidebar: Research", exact: true}).click();
  await expect(page.locator("#workspace-project-chats-5")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", {name: "Collapse sidebar: Research", exact: true})).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#workspace-project-chats-5")).toBeVisible();
  await page.getByRole("button", {name: "Collapse sidebar: Research", exact: true}).hover();
  await expect(page.getByRole("tooltip", {name: "Collapse sidebar: Research", exact: true})).toBeVisible();
});

test("sidebar footer shows the account behind Menu, whose services open above it", async ({
  page,
}) => {
  await page.goto("/chat");
  const footer = page.locator(".ws-sidebar-footer");
  await expect(
    footer.getByRole("button", { name: "Menu", exact: true }),
  ).toBeVisible();
  // Signed in, the Menu trigger is the account card: avatar, name and credits.
  await expect(footer.locator(".gx-account-name")).not.toBeEmpty();
  await expect(footer.locator(".gx-account-credits")).toContainText("credits");
  await footer.getByRole("button", { name: "Menu", exact: true }).click();
  await expect(
    page.getByRole("menuitem", { name: "Archive", exact: true }),
  ).toBeVisible();
  const menu = await page.getByRole("menu").boundingBox();
  const button = await footer.getByRole("button", { name: "Menu", exact: true }).boundingBox();
  expect(menu!.y + menu!.height).toBeLessThanOrEqual(button!.y);
});

test("F2 renames one chat inline and Escape cancels without a request", async ({
  page,
}) => {
  await page.goto("/chat");
  const row = page.locator('[data-workspace-chat="31"]');
  await expect(row).toBeVisible();
  await row
    .getByRole("button", { name: "Research notes", exact: true })
    .focus();
  await page.keyboard.press("F2");
  const input = row.getByRole("textbox");
  await expect(input).toBeFocused();
  await input.fill("Renamed notes");
  await input.press("Enter");
  await expect(row).toContainText("Renamed notes");
  await row.getByRole("button", { name: "Renamed notes", exact: true }).focus();
  await page.keyboard.press("F2");
  await row.getByRole("textbox").fill("Discard this");
  await page.keyboard.press("Escape");
  await expect(row).toContainText("Renamed notes");
});

test("project plus opens creation directly and context menu preserves selection", async ({
  page,
}) => {
  await page.goto("/chat");
  await page
    .getByRole("button", { name: "Create project", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Create project" }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Project name" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.locator('[data-workspace-chat="31"]').click({ button: "right" });
  await expect(page.getByRole("menuitem", { name: "Share" })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await expect(page).toHaveURL(/\/chat$/);
});
