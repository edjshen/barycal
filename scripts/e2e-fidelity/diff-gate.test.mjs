// scripts/e2e-fidelity/diff-gate.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isPathAllowed, checkDiff } from './diff-gate.mjs';

test('allows test + learning + playwright config paths', () => {
  for (const p of [
    'e2e/12-rsvp.spec.ts',
    'tests/e2e/spin.spec.js',
    'apps/web/e2e/smoke.spec.ts',
    '.learned-experience/e2e-fidelity.md',
    'playwright.config.ts',
  ])
    assert.equal(isPathAllowed(p), true, p);
});

test('denies app/lib/db and app-root harness files', () => {
  for (const p of [
    'app/discover/page.tsx',
    'lib/db.ts',
    'components/EventCard.tsx',
    'drizzle/0001_init.sql',
    'instrumentation.ts',
    'middleware.js',
    'next.config.ts',
    'vite.config.ts',
  ])
    assert.equal(isPathAllowed(p), false, p);
});

test('checkDiff reports violations', () => {
  const r = checkDiff(['e2e/a.spec.ts', 'lib/db.ts']);
  assert.equal(r.ok, false);
  assert.deepEqual(r.violations, ['lib/db.ts']);
});
