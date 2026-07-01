import fs from 'node:fs';
import path from 'node:path';

const WEB_FIRST =
  /\.(toBeVisible|toBeHidden|toHaveText|toContainText|toHaveValue|toHaveCount|toBeChecked|toHaveAttribute|toHaveURL|toBeEnabled|toBeDisabled)\b/;
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

export function buildScorecard({
  repo,
  testDir,
  contractPath,
  commit,
  timestamp,
  prev,
  dynamic = {},
}) {
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
    process.argv
      .slice(2)
      .reduce((a, x, i, arr) => (x.startsWith('--') ? [...a, [x.slice(2), arr[i + 1]]] : a), [])
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
