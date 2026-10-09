import { test, expect } from '@playwright/test';
const pages = ['/', '/index.html', '/chat.html', '/profile.html', '/notifications.html', '/support.html', '/policies/policies.html', '/policies/privacy-policy.html', '/policies/terms-of-service.html', '/policies/faq.html'];
for (const url of pages) test(`renders ${url} without runtime errors`, async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/**', route => route.fulfill({ status: 401, json: {message:'Unauthorized'} }));
  const response = await page.goto(url);
  await expect(page.locator('body')).not.toBeEmpty();
  await page.waitForTimeout(1000);
  await expect(page.getByRole('alert').filter({hasText:'Unable to load this page'})).toHaveCount(0);
  expect(response?.status()).toBe(200);
  expect(errors).toEqual([]);
});
test('admin access ignores forged cached role', async ({page}) => {
  await page.addInitScript(() => {localStorage.setItem('authToken','forged');localStorage.setItem('userRole','admin');});
  await page.route('**/api/**', route => route.fulfill({status:403,json:{message:'Forbidden'}}));
  await page.goto('/gate.html');
  await expect(page.getByRole('alert')).toContainText('Access denied');
  await expect(page.locator('#usersTable')).toHaveCount(0);
});
