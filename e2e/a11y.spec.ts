// Accessibility gate via axe-core, using the kit's merged `test`/`expect` and
// the shared `checkA11y` helper. Kept in its own @a11y tier: on a legacy app
// axe will surface real violations, so this runs non-blocking until they're
// triaged, then graduates into the required gate (see e2e/MIGRATION.md).
import { test, expect, checkA11y } from '@edjshen/e2e-kit';

test.describe('Accessibility — public', { tag: '@a11y' }, () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('login page has no WCAG A/AA violations', async ({ page }, testInfo) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: /log in/i })).toBeVisible();
    await checkA11y(page, testInfo);
  });
});

test.describe('Accessibility — authenticated', { tag: '@a11y' }, () => {
  test('calendar has no WCAG A/AA violations', async ({ page }, testInfo) => {
    await page.goto('/calendar');
    await expect(page.getByRole('navigation')).toBeVisible();
    await checkA11y(page, testInfo);
  });
});
