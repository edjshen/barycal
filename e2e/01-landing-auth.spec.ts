import { test, expect } from '@playwright/test';

// These exercise the auth flow itself, so they must run WITHOUT the pre-seeded
// session that the other authenticated specs reuse.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Authentication', { tag: ['@smoke', '@critical'] }, () => {
  test('login page renders the sign-in form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: /log in/i })).toBeVisible();
    await expect(page.getByLabel('Username')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('link', { name: /create account/i })).toBeVisible();
  });

  test('wrong credentials show an error and stay on /login', async ({ page }) => {
    // A throwaway handle (also "Invalid credentials") so this negative case
    // doesn't spend the demo user's per-handle login quota.
    await page.goto('/login');
    await page.getByLabel('Username').fill('nouser-e2e');
    await page.getByLabel('Password').fill('definitely-not-the-password');
    await page.getByRole('button', { name: /log in/i }).click();

    await expect(page.getByText(/invalid credentials/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('valid credentials land on the authenticated app', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Username').fill('ed');
    await page.getByLabel('Password').fill('barycal');
    await page.getByRole('button', { name: /log in/i }).click();

    // barycal routes a new session to its first tab; assert the authenticated
    // shell (the tab bar) rather than a specific landing route.
    await expect(page.getByRole('navigation')).toBeVisible();
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('a private route redirects to /login when signed out', async ({ page }) => {
    await page.goto('/calendar');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('button', { name: /log in/i })).toBeVisible();
  });
});
