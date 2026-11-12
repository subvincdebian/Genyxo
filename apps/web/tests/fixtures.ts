import { type Page, type Route } from "@playwright/test";
export const user = {
  id: 7,
  name: "Visual User",
  email: "visual@example.test",
  role: "user",
  credits: 150,
  referralBalance: 0,
  avatar: "/images/logo.svg",
  isEmailVerified: true,
};
export const token = `header.${Buffer.from(JSON.stringify({ id: 7, role: "user" })).toString("base64url")}.signature`;
export async function authenticate(page: Page, role = "user") {
  await page.addInitScript(
    ({ user, token, role }) => {
      localStorage.setItem("authToken", token);
      localStorage.setItem("userName", user.name);
      localStorage.setItem("userEmail", user.email);
      localStorage.setItem("userAvatar", user.avatar);
      localStorage.setItem("userCredits", String(user.credits));
      localStorage.setItem("userRole", role);
      localStorage.setItem("appLang", "en");
      // The Next.js dev overlay pill can sit over the sidebar footer; it never ships.
      document.addEventListener("DOMContentLoaded", () => {
        const style = document.createElement("style");
        style.textContent = "nextjs-portal{display:none!important}";
        document.head.appendChild(style);
      });
    },
    { user, token, role },
  );
}
/** The URL key the fixture API gives chat `id`, as the backend's /c/<uuid>. */
export const chatKey = (id: number) =>
  `00000000-0000-4000-8000-${String(id).padStart(12, "0")}`;

export async function mockApi(
  page: Page,
  override?: (route: Route, path: string) => Promise<boolean>,
) {
  await page.route("**/socket.io/**", (route) =>
    route.fulfill({ status: 400, body: "Socket disabled in fixture" }),
  );
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, "");
    if (override && (await override(route, path))) return;
    let json: unknown = {};
    if (path === "/profile") json = user;
    else if (path === "/profile/affiliate")
      json = {
        referralCode: "FIXTURE",
        referralBalance: 0,
        referralCount: 0,
        totalEarnings: 0,
      };
    else if (path === "/profile/transactions")
      json = {
        items: [],
        total: 0,
        meta: { currentPage: 1, totalPages: 1, totalItems: 0 },
      };
    else if (path === "/notifications/unread-count") json = { count: 0 };
    else if (
      path === "/notifications" ||
      path === "/support/my-tickets" ||
      path === "/chat/conversations"
    )
      json = [];
    else if (path.includes("/are-you-sure-you-want-to-admin/"))
      json = { data: [], meta: { page: 1, lastPage: 1, total: 0 } };
    else if (/^\/chat\/workspace\/conversations\/\d+\/key$/.test(path)) {
      const id = Number(path.split("/")[4]);
      json = { id, publicId: chatKey(id) };
    }
    await route.fulfill({ status: 200, json });
  });
}
