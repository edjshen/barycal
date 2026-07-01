// Prepare local Cloudflare D1 for E2E: apply migrations, then (re)generate and
// load the deterministic seed (demo user `ed` / `barycal`) into the same
// on-disk miniflare state that `next dev` reads. Runs BEFORE Playwright boots
// the web server (wired into the `test:e2e` script and CI). This mirrors the
// kit's D1LocalAdapter, kept as a plain node script so it runs standalone.
import { execFileSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

const run = (cmd, args) => execFileSync(cmd, args, { stdio: 'inherit' });

// Ensure local dev vars exist so `next dev` can seal sessions during the run.
// Test-only, generated per environment, and gitignored — never committed and
// never used in production. Left alone if a real .dev.vars already exists.
if (!existsSync('.dev.vars')) {
  const hex = () => randomBytes(32).toString('hex');
  const devVars =
    [
      `SESSION_SECRET=${hex()}`,
      `MFA_ENCRYPTION_KEY=${hex()}`,
      `CRON_SECRET=${hex()}`,
      `ROOM_RELAY_SECRET=${hex()}`,
      'APP_URL=http://localhost:3000',
      'ALLOWED_ORIGINS=http://localhost:3000',
    ].join('\n') + '\n';
  writeFileSync('.dev.vars', devVars);
  console.warn('[e2e-prepare] wrote test .dev.vars (gitignored)');
}

console.warn('[e2e-prepare] applying local D1 migrations…');
run('npm', ['run', 'db:migrate:local']);

console.warn('[e2e-prepare] seeding local D1 (demo user ed)…');
run('npm', ['run', 'db:seed:local']);

// Clear login throttle counters so each run starts fresh — the seed doesn't
// touch this table, and stale counters would trip the per-handle/IP limit.
console.warn('[e2e-prepare] clearing rate limits…');
run('npx', [
  'wrangler',
  'd1',
  'execute',
  'barycal-db',
  '--local',
  '--command',
  'DELETE FROM rate_limits;',
]);

console.warn('[e2e-prepare] local D1 ready.');
