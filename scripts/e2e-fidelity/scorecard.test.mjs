import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isSoft, scanSoftTests, computeStatic } from './scorecard.mjs';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';

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

test('computeStatic counts soft and total tests across a dir', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'e2efid-'));
  fs.writeFileSync(
    path.join(dir, 'a.spec.ts'),
    `test('soft', async ({ page }) => { expect(page.url()).toContain('localhost'); });
     test('good', async ({ page }) => { await expect(page.locator('h1')).toBeVisible(); });`
  );
  const r = computeStatic(dir);
  assert.equal(r.tests_total, 2);
  assert.equal(r.soft_tests, 1);
});
