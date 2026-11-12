import { test, expect } from '@playwright/test';
import { mockApi } from './fixtures';

test('footer groups fold below 800px and remain accessible with the keyboard', async ({ page }) => {
  await mockApi(page);
  await page.setViewportSize({ width: 799, height: 900 });
  await page.goto('/');
  const footer = page.locator('.gx-footer');
  const legal = footer.getByRole('button', { name: 'Legal', exact: true });
  const privacy = footer.getByRole('link', { name: 'Privacy policy' });
  await expect(legal).toHaveAttribute('aria-expanded', 'false');
  await expect(privacy).toBeHidden();
  await legal.focus();
  await legal.press('Enter');
  await expect(legal).toHaveAttribute('aria-expanded', 'true');
  await expect(privacy).toBeVisible();
  await legal.press('Enter');
  await expect(privacy).toBeHidden();
  await page.setViewportSize({ width: 800, height: 900 });
  await expect(legal).toHaveAttribute('aria-expanded', 'true');
  await expect(privacy).toBeVisible();
  await expect(footer.locator('.gx-footer-wordmark')).toHaveText('Genyxo');
  await expect(footer.locator('a[href*="instagram"],a[href*="facebook"],a[href*="tiktok"],a[href*="twitter"],a[href*="x.com"]')).toHaveCount(0);
});

test('footer language selection uses the existing i18n and narrow layout fits', async ({ page }) => {
  await mockApi(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const select = page.locator('.gx-footer-language select');
  await select.selectOption('uk');
  await expect(page.locator('html')).toHaveAttribute('lang', 'uk');
  await expect(select).toHaveValue('uk');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await expect(page.locator('.gx-footer')).toHaveCSS('margin-top', '0px');
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(page.locator('.gx-footer-wordmark')).toHaveCSS('opacity', '1');
});
