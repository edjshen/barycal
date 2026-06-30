# E2E Fidelity Loop — Core + barycal pilot — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the shared E2E-fidelity-loop mechanism (scorecard engine, safety gate, mutation-prover, MoE review panel, the loop skill) and prove it end-to-end in **barycal** with a twice-weekly cron routine, all touching test + learning files only — never app code, never merge/deploy.

**Architecture:** A Claude skill (`e2e-fidelity-loop`) orchestrates a 6-stage cycle — measure (scorecard engine) → learn (ledger) → fix top 3–5 (trust before realism) → mutation-prove → re-measure → MoE panel → open PR. Pure-function code pieces (soft-test scanner, diff-scope gate, mutation source-transform) are TDD'd with Node's built-in test runner; the panel is a `Workflow` script; the skill + contract are authored artifacts verified by concrete run commands.

**Tech Stack:** Node ESM (`node:test`, no new deps — mirrors barycal's existing `test:mayfly` pattern), Playwright, the `Workflow`/`Agent` tools, `gh` CLI, scheduled-trigger MCP.

**Spec:** `docs/superpowers/specs/2026-06-30-e2e-fidelity-loop-design.md` (read it before starting).

**Working dir:** the barycal worktree on branch `claude/epic-jang-c582c1`. All paths below are relative to the barycal repo root.

---

## File structure (created by this plan)

```
scripts/e2e-fidelity/
  scorecard.mjs          # soft-test scanner + static aggregation + JSON emit (U1, U2)
  scorecard.test.mjs     # node:test for scorecard pure functions
  diff-gate.mjs          # path allowlist/denylist safety gate (U3)
  diff-gate.test.mjs     # node:test for the safety gate
  mutate.mjs             # injectAbort source-transform + runMutated runner (U5)
  mutate.test.mjs        # node:test for injectAbort
  moe-panel.workflow.js  # mixture-of-experts review panel (U4) — run via the Workflow tool
.learned-experience/
  e2e-contract.md        # barycal harness contract (U6 / spec §4.1)
  e2e-fidelity.md        # qualitative ledger seed
  e2e-scorecard.json     # baseline scorecard (cycle 0), emitted by the engine
.claude/skills/e2e-fidelity-loop/
  SKILL.md               # the loop brain — 6-stage procedure (U7 / spec §2.2)
```

> Rollout into plur-nyc + poisys (copying `scripts/e2e-fidelity/` and `.claude/skills/e2e-fidelity-loop/`, writing their own `e2e-contract.md`, creating their cron routines) is **Plan 2** — out of scope here.

---

## Task 1: Soft-test scanner (TDD)

**Files:**
- Create: `scripts/e2e-fidelity/scorecard.mjs`
- Test: `scripts/e2e-fidelity/scorecard.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// scripts/e2e-fidelity/scorecard.test.mjs
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test scripts/e2e-fidelity/scorecard.test.mjs`
Expected: FAIL — `Cannot find module './scorecard.mjs'` / `isSoft is not a function`.

- [ ] **Step 3: Write the minimal implementation**

```js
// scripts/e2e-fidelity/scorecard.mjs
import fs from 'node:fs';
import path from 'node:path';

const WEB_FIRST =
  /\.(toBeVisible|toBeHidden|toHaveText|toContainText|toHaveValue|toHaveCount|toBeChecked|toHaveAttribute|toHaveURL|toBeEnabled|toBeDisabled)\b/;
const URL_ONLY = /expect\([^)]*(page\.url\(\)|\.url\b)[^)]*\)\.(toContain|toMatch|toBe)\b/;
const BODY_ONLY = /expect\([^)]*body[^)]*\)\.(toBeTruthy|toBeDefined)\b|\.length[^)]*\)\.(toBeGreaterThan|toBe)\b/i;
const SWALLOW = /\.catch\(\s*\(\)\s*=>\s*(false|null|undefined)\s*\)/;
const COND_SKIP = /else\s*\{\s*(console\.(log|warn)|return\b)/;
const WAIT_STATE = /waitForTimeout\(/;

export function splitTests(src) {
  // matches test(), test.only(), test.skip() … but NOT test.describe( and not the titleless test.beforeEach(
  const re = /\btest(?:\.(?!describe)\w+)?\(\s*[`'"](.+?)[`'"]/g;
  const marks = [];
  let m;
  while ((m = re.exec(src))) marks.push({ title: m[1], start: m.index });
  return marks.map((mk, i) => ({
    title: mk.title,
    body: src.slice(mk.start, i + 1 < marks.length ? marks[i + 1].start : src.length),
  }));
}

export function isSoft(body) {
  if (SWALLOW.test(body)) return true; // rule 3: swallowed check
  if (COND_SKIP.test(body)) return true; // rule 4: conditional-skip with no assertion
  if (!/expect\(/.test(body)) return true; // rule 6: no assertions at all
  if (!WEB_FIRST.test(body)) return true; // rules 1,2: only url/body-length style (no web-first outcome)
  if (URL_ONLY.test(body) && !WEB_FIRST.test(body)) return true;
  if (BODY_ONLY.test(body) && !WEB_FIRST.test(body)) return true;
  // rule 5: waitForTimeout gating state with no web-first assertion AFTER it
  if (WAIT_STATE.test(body)) {
    const after = body.split('waitForTimeout').slice(1).join('waitForTimeout');
    if (!WEB_FIRST.test(after)) return true;
  }
  return false;
}

export function scanSoftTests(src) {
  return splitTests(src)
    .filter((t) => isSoft(t.body))
    .map((t) => t.title);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test scripts/e2e-fidelity/scorecard.test.mjs`
Expected: PASS — 3 tests, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add scripts/e2e-fidelity/scorecard.mjs scripts/e2e-fidelity/scorecard.test.mjs
git commit -m "feat(e2e-fidelity): soft-test scanner (6 heuristic rules)"
```

---

## Task 2: Static aggregation + scorecard JSON emit

**Files:**
- Modify: `scripts/e2e-fidelity/scorecard.mjs` (append `computeStatic`, `buildScorecard`, CLI)
- Modify: `scripts/e2e-fidelity/scorecard.test.mjs` (add `computeStatic` test)

- [ ] **Step 1: Write the failing test**

Append to `scripts/e2e-fidelity/scorecard.test.mjs`:

```js
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { computeStatic } from './scorecard.mjs';

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
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test scripts/e2e-fidelity/scorecard.test.mjs`
Expected: FAIL — `computeStatic is not a function`.

- [ ] **Step 3: Implement `computeStatic`, `buildScorecard`, and a CLI**

Append to `scripts/e2e-fidelity/scorecard.mjs`:

```js
export function computeStatic(testDir) {
  const files = fs.readdirSync(testDir).filter((f) => /\.spec\.(t|j)s$/.test(f));
  let soft = 0;
  let total = 0;
  for (const f of files) {
    const tests = splitTests(fs.readFileSync(path.join(testDir, f), 'utf8'));
    total += tests.length;
    soft += tests.filter((t) => isSoft(t.body)).length;
  }
  return { soft_tests: soft, tests_total: total };
}

// flows_total is declared in the contract as a line: `flows_total: N`
export function readFlowsTotal(contractPath) {
  if (!fs.existsSync(contractPath)) return null;
  const m = fs.readFileSync(contractPath, 'utf8').match(/^flows_total:\s*(\d+)/m);
  return m ? Number(m[1]) : null;
}

export function buildScorecard({ repo, testDir, contractPath, commit, timestamp, prev, dynamic = {} }) {
  const stat = computeStatic(testDir);
  const metrics = {
    soft_tests: stat.soft_tests,
    tests_total: stat.tests_total,
    flows_total: readFlowsTotal(contractPath),
    flows_asserted: dynamic.flows_asserted ?? null,
    negative_edge_cases: dynamic.negative_edge_cases ?? null,
    flake_rate: dynamic.flake_rate ?? null,
    mutation_kill_rate: dynamic.mutation_kill_rate ?? null,
    telemetry_signal: null,
  };
  const delta = prev
    ? Object.fromEntries(
        Object.entries(metrics)
          .filter(([k, v]) => typeof v === 'number' && typeof prev.metrics?.[k] === 'number')
          .map(([k, v]) => [k, +(v - prev.metrics[k]).toFixed(4)])
      )
    : {};
  return {
    repo,
    cycle: prev ? prev.cycle + 1 : 0,
    timestamp,
    commit,
    metrics,
    delta_vs_prev: delta,
    notes_ref: '.learned-experience/e2e-fidelity.md',
  };
}

export function appendScorecard(jsonPath, card) {
  const arr = fs.existsSync(jsonPath) ? JSON.parse(fs.readFileSync(jsonPath, 'utf8')) : [];
  arr.push(card);
  fs.writeFileSync(jsonPath, JSON.stringify(arr, null, 2) + '\n');
  return arr;
}

// CLI: node scripts/e2e-fidelity/scorecard.mjs --repo barycal --test-dir e2e --commit <sha> --timestamp <iso>
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = Object.fromEntries(
    process.argv.slice(2).reduce((a, x, i, arr) => (x.startsWith('--') ? [...a, [x.slice(2), arr[i + 1]]] : a), [])
  );
  const root = process.cwd();
  const jsonPath = path.join(root, '.learned-experience/e2e-scorecard.json');
  const prevArr = fs.existsSync(jsonPath) ? JSON.parse(fs.readFileSync(jsonPath, 'utf8')) : [];
  const card = buildScorecard({
    repo: args.repo || path.basename(root),
    testDir: path.join(root, args['test-dir'] || 'e2e'),
    contractPath: path.join(root, '.learned-experience/e2e-contract.md'),
    commit: args.commit || 'unknown',
    timestamp: args.timestamp || new Date().toISOString(),
    prev: prevArr[prevArr.length - 1] || null,
  });
  appendScorecard(jsonPath, card);
  console.log(JSON.stringify(card.metrics, null, 2));
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --test scripts/e2e-fidelity/scorecard.test.mjs`
Expected: PASS — 4 tests, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add scripts/e2e-fidelity/scorecard.mjs scripts/e2e-fidelity/scorecard.test.mjs
git commit -m "feat(e2e-fidelity): static aggregation + scorecard JSON emit + CLI"
```

---

## Task 3: Diff-scope safety gate (TDD)

This is the safety-critical guard: the loop aborts the PR if its diff touches anything outside the allowlist (spec §1 constraints).

**Files:**
- Create: `scripts/e2e-fidelity/diff-gate.mjs`
- Test: `scripts/e2e-fidelity/diff-gate.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test scripts/e2e-fidelity/diff-gate.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```js
// scripts/e2e-fidelity/diff-gate.mjs
const ALLOW = [
  /^e2e\//,
  /^tests\/e2e\//,
  /^apps\/web\/e2e\//,
  /^\.learned-experience\//,
  /(^|\/)playwright\.config\.[tj]s$/,
];
// App-root harness files are test-adjacent but can change app behavior — deny even if "test-related".
const DENY = [
  /^app\//,
  /^lib\//,
  /^components\//,
  /^drizzle\//,
  /supabase\/migrations\//,
  /(^|\/)instrumentation\.[tj]s$/,
  /(^|\/)middleware\.[tj]s$/,
  /(^|\/)next\.config\./,
  /(^|\/)vite\.config\./,
];

export function isPathAllowed(p) {
  if (DENY.some((re) => re.test(p))) return false;
  if (/^package\.json$/.test(p)) return true; // scripts-block edits only; panel safety lens eyeballs the hunk
  return ALLOW.some((re) => re.test(p));
}

export function checkDiff(paths) {
  const violations = paths.filter((p) => !isPathAllowed(p));
  return { ok: violations.length === 0, violations };
}

// CLI: git diff --name-only <base>...HEAD | node scripts/e2e-fidelity/diff-gate.mjs
if (import.meta.url === `file://${process.argv[1]}`) {
  let buf = '';
  process.stdin.on('data', (d) => (buf += d));
  process.stdin.on('end', () => {
    const paths = buf.split('\n').map((s) => s.trim()).filter(Boolean);
    const r = checkDiff(paths);
    if (!r.ok) {
      console.error('DIFF-GATE VIOLATION — out-of-scope files:\n' + r.violations.join('\n'));
      process.exit(1);
    }
    console.log(`diff-gate OK (${paths.length} files in scope)`);
  });
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --test scripts/e2e-fidelity/diff-gate.test.mjs`
Expected: PASS — 3 tests, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add scripts/e2e-fidelity/diff-gate.mjs scripts/e2e-fidelity/diff-gate.test.mjs
git commit -m "feat(e2e-fidelity): diff-scope safety gate (allowlist + app-root deny)"
```

---

## Task 4: Mutation source-transform (TDD) + runner

Mutation-prove without touching app code: copy a spec to a temp file, inject a route-abort that breaks its flow's API, run it, and assert it goes RED. A spec that still passes is soft.

**Files:**
- Create: `scripts/e2e-fidelity/mutate.mjs`
- Test: `scripts/e2e-fidelity/mutate.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// scripts/e2e-fidelity/mutate.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { injectAbort } from './mutate.mjs';

const SPEC = `import { test, expect } from '@playwright/test';
test.describe('RSVP', () => {
  test('down', async ({ page }) => { await page.goto('/discover'); });
});`;

test('injectAbort inserts a route-abort beforeEach into the describe block', () => {
  const out = injectAbort(SPEC, '**/api/**');
  assert.match(out, /page\.route\(/);
  assert.match(out, /r\.abort\(\)/);
  assert.match(out, /\*\*\/api\/\*\*/);
  // inserted inside the describe body, before the existing test
  assert.ok(out.indexOf('page.route(') < out.indexOf("test('down'"));
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test scripts/e2e-fidelity/mutate.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```js
// scripts/e2e-fidelity/mutate.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

export function injectAbort(specSrc, glob) {
  const hook = `\n  test.beforeEach(async ({ page }) => { await page.route(${JSON.stringify(
    glob
  )}, (r) => r.abort()); });\n`;
  const d = specSrc.search(/test\.describe\([^]*?\)\s*=>\s*\{/);
  if (d === -1) {
    // no describe: inject after the import line
    const nl = specSrc.indexOf('\n');
    return specSrc.slice(0, nl + 1) + hook + specSrc.slice(nl + 1);
  }
  const brace = specSrc.indexOf('{', d) + 1;
  return specSrc.slice(0, brace) + hook + specSrc.slice(brace);
}

// Run a single spec with the flow's API aborted; returns { killed } — killed=true means the spec
// correctly FAILED under mutation (good). killed=false means it survived (soft — bad).
export function runMutated(specPath, glob, { configArg = '' } = {}) {
  const src = fs.readFileSync(specPath, 'utf8');
  const tmp = path.join(os.tmpdir(), `mutated-${Date.now()}-${path.basename(specPath)}`);
  fs.writeFileSync(tmp, injectAbort(src, glob));
  const res = spawnSync(
    'npx',
    ['playwright', 'test', tmp, ...(configArg ? ['--config', configArg] : []), '--reporter=line'],
    { encoding: 'utf8' }
  );
  fs.rmSync(tmp, { force: true });
  return { killed: res.status !== 0, output: (res.stdout || '') + (res.stderr || '') };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --test scripts/e2e-fidelity/mutate.test.mjs`
Expected: PASS — 1 test, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add scripts/e2e-fidelity/mutate.mjs scripts/e2e-fidelity/mutate.test.mjs
git commit -m "feat(e2e-fidelity): mutation prover (route-abort source-transform + runner)"
```

---

## Task 5: MoE review panel (Workflow script)

A `Workflow` script the loop runs via the Workflow tool to adversarially review its own diff. Four lenses; safety is a hard gate; ≥2 of the other three must pass (mirrors CLAUDE.md gate-(b)).

**Files:**
- Create: `scripts/e2e-fidelity/moe-panel.workflow.js`

- [ ] **Step 1: Write the workflow script**

```js
// scripts/e2e-fidelity/moe-panel.workflow.js
// Run via the Workflow tool: Workflow({ scriptPath: 'scripts/e2e-fidelity/moe-panel.workflow.js', args: { diff: '<unified diff>' } })
export const meta = {
  name: 'e2e-moe-panel',
  description: 'Mixture-of-experts adversarial review of an e2e-fidelity diff',
  phases: [{ title: 'Review' }],
};

const VERDICT = {
  type: 'object',
  properties: {
    pass: { type: 'boolean' },
    notes: { type: 'string' },
  },
  required: ['pass', 'notes'],
  additionalProperties: false,
};

const diff = (args && args.diff) || '(no diff provided)';

const LENSES = [
  [
    'assertion-skeptic',
    `You are an ASSERTION SKEPTIC reviewing an E2E test diff. For each new/changed spec, decide: would it still PASS if the underlying feature were broken? Audit any mutation evidence in the diff. Set pass=false if any assertion lacks teeth (url-only, body-length-only, swallowed with .catch(()=>false), or conditionally skipped). Default to pass=false when unsure.`,
  ],
  [
    'realism-ux',
    `You are a UX REALISM expert reviewing an E2E test diff. Decide whether it simulates a real user (realistic data, real navigation sequences, negative/edge cases) versus a robot clicking happy paths. Set pass=false if the simulation is unrealistic or shallow; note what real behavior is unmodeled.`,
  ],
  [
    'determinism-flake',
    `You are a DETERMINISM/FLAKE expert reviewing an E2E test diff. Find timing races, waitForTimeout used to gate state, shared-state collisions, order-dependence, or non-hermetic outbound calls. Set pass=false if any flake risk is present.`,
  ],
  [
    'safety-scope',
    `You are a SAFETY/SCOPE reviewer. Confirm the diff touches ONLY test files (e2e/**, tests/e2e/**, apps/web/e2e/**), .learned-experience/**, playwright.config.*, or the package.json scripts block. Set pass=false if it touches app/lib/components/db/migrations, instrumentation/middleware/next.config/vite.config, or implies any merge/deploy/push to main.`,
  ],
];

const verdicts = await parallel(
  LENSES.map(([lens, prompt]) => () =>
    agent(`${prompt}\n\nDIFF:\n${diff}`, { label: lens, phase: 'Review', schema: VERDICT }).then((v) => ({
      lens,
      ...v,
    }))
  )
);

const clean = verdicts.filter(Boolean);
const by = Object.fromEntries(clean.map((v) => [v.lens, v]));
const safety = by['safety-scope']?.pass === true;
const others = ['assertion-skeptic', 'realism-ux', 'determinism-flake'].filter((l) => by[l]?.pass).length;
const approve = safety && others >= 2;
return { approve, safety_pass: safety, others_passing: others, verdicts: clean };
```

- [ ] **Step 2: Verify it parses (syntax check)**

Run: `node --check scripts/e2e-fidelity/moe-panel.workflow.js`
Expected: no output, exit 0 (valid JS).

- [ ] **Step 3: Commit**

```bash
git add scripts/e2e-fidelity/moe-panel.workflow.js
git commit -m "feat(e2e-fidelity): mixture-of-experts review panel workflow"
```

> Note: the panel's behavioral verification (feeding it a real soft-spec diff and confirming the assertion-skeptic returns pass=false) happens in Task 8's dry-run, since it requires the Workflow tool at runtime.

---

## Task 6: barycal contract + ledger seed + baseline scorecard

**Files:**
- Create: `.learned-experience/e2e-contract.md`
- Create: `.learned-experience/e2e-fidelity.md`
- Create (via engine): `.learned-experience/e2e-scorecard.json`

- [ ] **Step 1: Write the barycal contract**

Create `.learned-experience/e2e-contract.md` with exactly this content:

````markdown
# barycal — E2E Fidelity Contract

flows_total: 14

## Run
- Command: `npx playwright test` (config `playwright.config.ts`, baseURL `http://localhost:3000`, projects `chromium` + `mobile`, browser `/opt/pw-browsers/chromium`).
- The loop should add a `test:e2e` npm script (scripts block only) as an early trust fix.

## Dev-server + DB safety (MANDATORY)
- `npm run db:migrate:local && npm run db:seed:local` (wrangler D1 **--local**, miniflare SQLite; `scripts/gen-seed.ts` → `drizzle/seed.sql`), then `npm run dev`.
- **NEVER** `db:migrate:remote` / `db:seed:remote`. The loop must only ever target `--local`.
- Real login: username `ed`, password `barycal`, against the **seeded local DB only**.

## Mutation lever
- Break the flow's API by route-aborting it on a throwaway copy of the spec (see `scripts/e2e-fidelity/mutate.mjs`). Default glob `**/api/**`; narrow per flow where known (e.g. RSVP → the RSVP mutation endpoint). No app-code edits.

## Personas
- `ed` — the single owner-user (barycal is single-user).

## Canonical flow inventory (14)
1. landing-auth  2. navigation  3. discover  4. calendar  5. create-event
6. circles  7. regulars  8. profile  9. plans  10. public-pages
11. rsvp  12. event-detail  13. mobile-ux  14. error-states

(Most of the existing `e2e/0x–15` specs are currently SOFT — trust fixes come before realism.)
````

- [ ] **Step 2: Write the ledger seed**

Create `.learned-experience/e2e-fidelity.md` with exactly this content:

```markdown
# E2E Fidelity Ledger — barycal

Maintained by the `e2e-fidelity-loop` skill. Each cycle appends a dated block:
findings (prioritized: soft tests → coverage gaps → realism), root cause,
"how a real user differs," what was fixed, what remains. Scorecard numbers live
in `e2e-scorecard.json`; this file holds the *why*.

## Cycle 0 — baseline (seed)
- Baseline scorecard captured. Known disease: most `e2e/*.spec.ts` are soft —
  e.g. `12-rsvp.spec.ts` and `01-landing-auth.spec.ts` assert only `page.url()`
  / body length and swallow checks with `.catch(() => false)`, so they pass even
  when the feature is broken. Trust fixes precede any realism work.
```

- [ ] **Step 3: Emit the baseline scorecard**

Run:
```bash
node scripts/e2e-fidelity/scorecard.mjs --repo barycal --test-dir e2e --commit "$(git rev-parse --short HEAD)" --timestamp "2026-06-30T00:00:00Z"
```
Expected: prints a metrics JSON with `"soft_tests"` ≥ 8 and `"flows_total": 14`, and creates `.learned-experience/e2e-scorecard.json` as a 1-element array.

- [ ] **Step 4: Sanity-check the emitted file**

Run: `node -e "const a=require('./.learned-experience/e2e-scorecard.json'); console.log(a.length, a[0].metrics.soft_tests, a[0].metrics.flows_total)"`
Expected: `1 <N≥8> 14`.

- [ ] **Step 5: Commit**

```bash
git add .learned-experience/e2e-contract.md .learned-experience/e2e-fidelity.md .learned-experience/e2e-scorecard.json
git commit -m "feat(e2e-fidelity): barycal contract + ledger seed + baseline scorecard"
```

---

## Task 7: The `e2e-fidelity-loop` skill

**Files:**
- Create: `.claude/skills/e2e-fidelity-loop/SKILL.md`

- [ ] **Step 1: Write the skill**

Create `.claude/skills/e2e-fidelity-loop/SKILL.md` with exactly this content:

````markdown
---
name: e2e-fidelity-loop
description: Run ONE bounded increment of the self-learning E2E fidelity loop for the current repo (measure → learn → fix top 3–5 trust-then-realism gaps → mutation-prove → MoE-review → open a PR). Invoked by the repo's twice-weekly cron routine or manually. Never merges or deploys.
---

# E2E Fidelity Loop

Run exactly ONE bounded increment, then stop. Read `.learned-experience/e2e-contract.md`
first — it defines the run command, DB-safety rule, mutation lever, personas, and flow
inventory for THIS repo. Obey the spec at `docs/superpowers/specs/2026-06-30-e2e-fidelity-loop-design.md`.

## Hard rules (never violate)
- Diff surface = test files + `.learned-experience/**` + `playwright.config.*` + the
  `package.json` scripts block ONLY. Before opening the PR, run the diff gate; if it fails, drop the
  offending changes.
- NEVER edit app/lib/components/db/migrations or app-root harness files (instrumentation,
  middleware, next.config, vite.config). If a fix needs one, note it in the PR body for a human.
- NEVER merge, NEVER deploy, NEVER push to `main`. The PR is the terminal output.
- Obey the contract's DB-safety rule (barycal: `--local` only, never `--remote`).
- Bounded: fix at most 5 specs this run.

## Procedure

### Stage 1 — Measure
1. Bring up the harness per the contract (migrate+seed local DB, start dev server).
2. Run the suite. Repeat 3× to estimate `flake_rate` (failures ÷ (specs × 3)).
3. Emit the scorecard:
   `node scripts/e2e-fidelity/scorecard.mjs --repo <repo> --test-dir <dir> --commit "$(git rev-parse --short HEAD)" --timestamp <iso>`
   Then hand-fill `flake_rate` (and later `mutation_kill_rate`) into the new entry.

### Stage 2 — Learn
4. Compare the new metrics to the previous scorecard entry. Append a dated block to
   `.learned-experience/e2e-fidelity.md`: prioritized findings (trust-first: soft tests &
   mutation survivors → coverage gaps → realism), each with root cause and "how a real user differs."

### Stage 3 — Improve (bounded, top 3–5)
5. Pick the top 3–5 gaps in priority order. **Trust before realism:**
   - Replace swallow-and-log / url-only / body-length assertions with web-first assertions on the
     actual user-visible outcome (`expect(locator).toBeVisible/toHaveText/...`).
   - Delete conditional-skips; replace `waitForTimeout`-for-state with `expect.poll` / web-first waits.
   - Only once a flow's trust is fixed, add realism: realistic persona data, real navigation,
     negative/edge/concurrency cases from the contract's flow inventory.
6. Re-run each changed spec; it must be GREEN against the real (seeded) app.

### Stage 4 — Mutation-prove
7. For each improved happy-path spec, run the mutation prover with the flow's API glob:
   `node -e "import('./scripts/e2e-fidelity/mutate.mjs').then(m=>m.runMutated('<spec>', '<glob>').then(r=>console.log(r.killed)))"`
   Require `killed === true` (the spec goes RED when the feature breaks). If `killed === false`, the
   assertion still lacks teeth — strengthen it and repeat. Record `mutation_kill_rate` =
   killed ÷ improved-happy-path-specs into the scorecard entry.

### Stage 5 — Re-measure & gate
8. Re-emit the scorecard. Require monotonic improvement: no metric regresses and at least one trust
   metric (`soft_tests` ↓ or `mutation_kill_rate` ↑) improves. Revert any change that didn't move a
   metric or introduced flake.

### Stage 6 — Panel + PR
9. Stage the diff and run the safety gate:
   `git add -A && git diff --cached --name-only | node scripts/e2e-fidelity/diff-gate.mjs`
   It must print "diff-gate OK". If it errors, unstage the offending files and fix.
10. Run the MoE panel via the Workflow tool:
    `Workflow({ scriptPath: 'scripts/e2e-fidelity/moe-panel.workflow.js', args: { diff: <the cached unified diff> } })`.
    If `approve === false`, address the failing lenses' notes (bounded: 2 retries), else drop the
    weak change(s) and proceed with what passed.
11. Open the PR on branch `e2e-fidelity/<repo>-<YYYY-MM-DD>` (base = repo default branch) with
    `gh pr create`. Body must include: the scorecard delta table, the ledger excerpt, the mutation
    evidence, the panel verdicts, and the line:
    *"Auto-generated by e2e-fidelity-loop. Not authorized to merge or deploy — human review +
    standard deploy gate required."*
12. Stop. Do not merge, deploy, or start another increment.
````

- [ ] **Step 2: Verify the skill is well-formed**

Run: `head -5 .claude/skills/e2e-fidelity-loop/SKILL.md`
Expected: shows the YAML frontmatter with `name: e2e-fidelity-loop` and a `description:` line.

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/e2e-fidelity-loop/SKILL.md
git commit -m "feat(e2e-fidelity): the e2e-fidelity-loop skill (6-stage bounded increment)"
```

---

## Task 8: Dry-run the loop in barycal (proof, no PR yet)

Exercise the mechanism end-to-end **up to but not including** the real PR/cron, to prove it produces a bounded, in-scope, mutation-proven improvement.

**Files:** modifies 1–3 barycal specs under `e2e/` + `.learned-experience/*` only.

- [ ] **Step 1: Invoke the skill on barycal**

Invoke the `e2e-fidelity-loop` skill. Let it run Stages 1–5 against a **local** seeded barycal
(`npm run db:migrate:local && npm run db:seed:local && npm run dev`). Target a single high-value soft
flow first: **rsvp** (`e2e/12-rsvp.spec.ts`).

- [ ] **Step 2: Confirm the trust fix is real (mutation kill)**

Run:
```bash
node -e "import('./scripts/e2e-fidelity/mutate.mjs').then(m=>m.runMutated('e2e/12-rsvp.spec.ts','**/api/**').then(r=>{console.log('killed:',r.killed);process.exit(r.killed?0:1)}))"
```
Expected: `killed: true` (after the fix, the RSVP spec FAILS when its API is aborted). Before the
fix the same command prints `killed: false` — capture both in the ledger as the trust-delta evidence.

- [ ] **Step 3: Confirm the diff is in scope**

Run: `git add -A && git diff --cached --name-only | node scripts/e2e-fidelity/diff-gate.mjs`
Expected: `diff-gate OK (<n> files in scope)` — and the file list contains only `e2e/**` and
`.learned-experience/**`.

- [ ] **Step 4: Run the MoE panel on the staged diff**

Use the Workflow tool: `Workflow({ scriptPath: 'scripts/e2e-fidelity/moe-panel.workflow.js', args: { diff: '<output of: git diff --cached>' } })`.
Expected: returns `{ approve: true, safety_pass: true, others_passing: >=2, ... }` for a genuine
trust fix. (Sanity check the panel discriminates: temporarily stage a no-op url-only spec and
confirm the assertion-skeptic returns `pass:false`; then unstage it.)

- [ ] **Step 5: Confirm scorecard moved the right way**

Run: `node -e "const a=require('./.learned-experience/e2e-scorecard.json'); const [p,c]=a.slice(-2); console.log('soft', p.metrics.soft_tests,'->',c.metrics.soft_tests,'| kill', c.metrics.mutation_kill_rate)"`
Expected: `soft_tests` decreased and `mutation_kill_rate` is ≥ the prior value (and > 0).

- [ ] **Step 6: Commit the dry-run result**

```bash
git add -A
git commit -m "test(e2e-fidelity): barycal dry-run — rsvp trust fix, mutation-killed, in-scope"
```

- [ ] **Step 7: STOP and hand off for the cron decision**

Do **not** create the live cron routine autonomously — a standing twice-weekly cloud agent is a
durable automation. Report the dry-run results and the exact trigger spec below, and let Ed approve
creating + enabling it:

- Tool: `create_trigger`
- `name`: `e2e-fidelity-loop — barycal`
- `cron_expression`: `0 7 * * 3,0`  (Wed + Sun, 07:00 UTC ≈ 03:00 ET)
- `create_new_session_on_fire`: `true`
- `environment_id`: resolve via `list_environments` (barycal's env)
- `prompt`: *"Run the e2e-fidelity-loop skill for barycal per `.learned-experience/e2e-contract.md`. One bounded increment. Use the LOCAL seeded D1 only (never --remote). Open one MoE-reviewed PR on an `e2e-fidelity/barycal-<date>` branch. Never merge or deploy."*

---

## Self-review (against the spec)

- **Spec §2.1 artifacts** → Task 6 (contract, ledger, scorecard). ✓
- **Spec §2.2 six-stage skill** → Task 7 (SKILL.md encodes all six stages). ✓
- **Spec §2.3 MoE panel (4 lenses, ≥2 concur, safety hard gate)** → Task 5 + invoked in Task 7/8. ✓
- **Spec §2.4 PR (branch, body, never-merge line)** → Task 7 Stage 6 (Step 11). ✓
- **Spec §2.5 scheduler (twice weekly, fresh session)** → Task 8 Step 7 (gated on Ed's approval). ✓
- **Spec §2.6 / §1 safety allowlist** → Task 3 (diff-gate) + Task 7 hard rules. ✓
- **Spec §3 scorecard schema + metric defs** → Tasks 1–2 (soft_tests rules, JSON shape, mutation_kill_rate). ✓
- **Spec §3 `mutation_kill_rate` (RED-when-broken)** → Task 4 (runMutated `killed`) + Task 8 Step 2. ✓
- **Spec §4.1 barycal contract (`--local` only, login, levers, inventory)** → Task 6 Step 1. ✓
- **Spec §5 "build once" location** → `scripts/e2e-fidelity/` + `.claude/skills/…` (this plan). Rollout = Plan 2. ✓

**Placeholder scan:** none — every code/artifact step has full content; "open items" are explicitly deferred to Plan 2 / Ed-gated, not in-plan placeholders.
**Type consistency:** `isSoft`/`scanSoftTests`/`computeStatic`/`buildScorecard`/`appendScorecard` (Tasks 1–2), `isPathAllowed`/`checkDiff` (Task 3), `injectAbort`/`runMutated` (Task 4) are referenced consistently in the skill (Task 7) and dry-run (Task 8). `mutation_kill_rate` used uniformly (never the inverted "survival"). ✓

**Out of scope (Plan 2):** copying `scripts/e2e-fidelity/` + the skill into plur-nyc & poisys, writing their `e2e-contract.md` (plur-nyc adopts its existing E2E design doc; poisys confirms non-prod Supabase first), and creating their two cron routines.
