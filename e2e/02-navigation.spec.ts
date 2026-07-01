import { test, expect } from '@playwright/test';

// Authenticated: these reuse the shared storageState from the `setup` project,
// so no per-test login. Targets the REAL current tab bar (Organizations /
// Regulars / Calendar / Profile) — the folded Plans/Circles tabs are gone.
test.describe('Primary navigation', { tag: ['@smoke', '@critical'] }, () => {
  const DESTINATIONS = [
    { label: 'Organizations', url: /\/organizations/ },
    { label: 'Regulars', url: /\/regulars/ },
    { label: 'Calendar', url: /\/calendar/ },
    { label: 'Profile', url: /\/you/ },
  ];

  // The tab bar is the one <nav> landmark that contains a "Regulars" link.
  const tabBar = (page: import('@playwright/test').Page) =>
    page.getByRole('navigation').filter({ has: page.getByRole('link', { name: 'Regulars' }) });

  test('the tab bar exposes the primary destinations', async ({ page }) => {
    await page.goto('/discover');
    const nav = tabBar(page);
    await expect(nav).toBeVisible();
    for (const { label } of DESTINATIONS) {
      await expect(nav.getByRole('link', { name: label })).toBeVisible();
    }
  });

  for (const { label, url } of DESTINATIONS) {
    test(`navigates to ${label}`, async ({ page }) => {
      await page.goto('/discover');
      await tabBar(page).getByRole('link', { name: label }).click();
      await expect(page).toHaveURL(url);
    });
  }
});
