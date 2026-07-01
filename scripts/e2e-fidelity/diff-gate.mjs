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
  if (/^package\.json$/.test(p)) return true; // ponytail: scripts-block edits only; panel safety lens eyeballs the hunk
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
    const paths = buf
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    const r = checkDiff(paths);
    if (!r.ok) {
      console.error('DIFF-GATE VIOLATION — out-of-scope files:\n' + r.violations.join('\n'));
      process.exit(1);
    }
    console.log(`diff-gate OK (${paths.length} files in scope)`);
  });
}
