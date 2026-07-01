import { test, expect } from '@playwright/test';

// Authenticated: reuses the shared storageState from the `setup` project.
test.describe('Profile', { tag: ['@smoke', '@critical'] }, () => {
  test('shows the signed-in user and profile actions', async ({ page }) => {
    await page.goto('/you');
    await expect(page.getByText('@ed')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Share' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Edit profile' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();
  });

  test('opening "Edit profile" reveals the edit form', async ({ page }) => {
    await page.goto('/you');
    await page.getByRole('button', { name: 'Edit profile' }).click();
    await expect(page.getByRole('heading', { name: 'Edit profile' })).toBeVisible();
    await expect(page.getByText('Display name')).toBeVisible();
  });
});
