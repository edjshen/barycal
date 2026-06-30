import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isSoft, scanSoftTests } from './scorecard.mjs';

// Mirrors the real barycal soft pattern (e2e/12-rsvp.spec.ts, e2e/01-landing-auth.spec.ts)
const SOFT_SWALLOW = `
  test('rsvp toggles', async ({ page }) => {
    const btn = page.locator('button:has-text("Down")').first();
    const has = await btn.isVisible({ timeout: 3000 }).catch(() => false);
    if (has) { await btn.click(); } else { console.log('no button'); }
    expect(page.url()).toContain('localhost:3000');
  });`;

const SOFT_URL_ONLY = `
  test('landing renders', async ({ page }) => {
    await page.goto('/');
    const body = await page.locator('body').textContent();
    expect(body).toBeTruthy();
    expect(body.length).toBeGreaterThan(10);
  });`;

const GOOD = `
  test('login form renders', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type="password"]').first()).toBeVisible({ timeout: 5000 });
  });`;

test('isSoft flags swallow-and-log + url-only assertions', () => {
  assert.equal(isSoft(SOFT_SWALLOW), true);
  assert.equal(isSoft(SOFT_URL_ONLY), true);
});

test('isSoft does not flag a real web-first assertion', () => {
  assert.equal(isSoft(GOOD), false);
});

test('scanSoftTests returns titles of soft tests only', () => {
  const src = SOFT_SWALLOW + '\n' + GOOD;
  const titles = scanSoftTests(src);
  assert.deepEqual(titles, ['rsvp toggles']);
});
