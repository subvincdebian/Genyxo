import { expect, test } from '@playwright/test';
import { mockApi } from './fixtures';

test('navigation has one layout at every breakpoint and the menu remains usable', async ({ page }) => {
  await mockApi(page);
  await page.goto('/');
  await expect(page.locator('#loginBtn')).toBeEnabled();

  for (const width of [320, 360, 390, 600, 601, 768, 769, 900, 901, 1024, 1440]) {
    await page.setViewportSize({ width, height: 850 });
    const layout = await page.evaluate(() => {
      const burger = document.querySelector<HTMLElement>('#burger')!;
      const links = document.querySelector<HTMLElement>('.navbar .nav-links')!;
      const login = document.querySelector<HTMLElement>('#loginBtn')!;
      const nav = document.querySelector<HTMLElement>('.navbar')!;
      const bounds = [burger, links, login, nav].map((element) => element.getBoundingClientRect());
      const visible = (element: HTMLElement) => getComputedStyle(element).display !== 'none';
      return {
        burgerVisible: visible(burger),
        linksVisible: visible(links),
        bounds: bounds.map(({ left, right }) => ({ left, right })),
        loginNoWrap: getComputedStyle(login).whiteSpace === 'nowrap',
        pageFits: document.documentElement.scrollWidth <= innerWidth,
      };
    });
    expect(layout.burgerVisible, `burger at ${width}px`).toBe(width <= 900);
    expect(layout.linksVisible, `links at ${width}px`).toBe(width > 900);
    expect(layout.pageFits, `page overflow at ${width}px`).toBeTruthy();
    expect(layout.loginNoWrap, `login wrapped at ${width}px`).toBeTruthy();
    for (const index of [2, 3, ...(width > 900 ? [1] : [])]) {
      expect(layout.bounds[index].left, `left edge at ${width}px`).toBeGreaterThanOrEqual(-1);
      expect(layout.bounds[index].right, `right edge at ${width}px`).toBeLessThanOrEqual(width + 1);
    }
  }

  await page.setViewportSize({ width: 601, height: 850 });
  await page.locator('#burger').click();
  await expect(page.locator('#burger')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#mobileMenu')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#burger')).toHaveAttribute('aria-expanded', 'false');
  await page.locator('#burger').click();
  await page.locator('#closeMobileMenu').click();
  await expect(page.locator('#mobileMenu')).toBeHidden();
});

test('legacy HTML URLs resolve to clean Next.js routes', async ({ page }) => {
  await mockApi(page);
  await page.goto('/index.html');
  await expect(page).toHaveURL(/127\.0\.0\.1:\d+\/$/);
  await expect(page.locator('.gx-hero h1')).toBeVisible();
  await page.goto('/chat.html');
  await expect(page).toHaveURL(/127\.0\.0\.1:\d+\/chat$/);
});
