import { test, expect } from '@playwright/test';

// Public, account-free pages — run signed-out.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Public profile', { tag: ['@smoke', '@critical'] }, () => {
  test('renders a seeded public profile without auth and shows a sign-up CTA', async ({ page }) => {
    await page.goto('/u/ed');
    await expect(page).toHaveURL(/\/u\/ed$/);
    await expect(page.getByText('@ed')).toBeVisible();
    await expect(page.getByText(/sign up to follow/i)).toBeVisible();
  });

  test('an unknown handle returns 404', async ({ page }) => {
    const response = await page.goto('/u/not-a-real-handle-e2e');
    expect(response?.status()).toBe(404);
  });
});
