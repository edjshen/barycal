// ESLint flat config — required by ESLint 9 (legacy .eslintrc is dropped in v10).
//
// barycal had no ESLint installed (the old `next lint` script was a no-op without
// it). This pulls eslint-config-next's flat config directly (it ships native flat
// presets at /core-web-vitals) and layers eslint-config-prettier last so Prettier
// owns all formatting and ESLint owns correctness — no rule fights between them.
//
// Most project rules are `warn`, not `error`: a first scan of a codebase that has
// never been linted will surface pre-existing issues, and a wall of errors would
// red every PR on day one. Warnings keep CI green while still surfacing the
// findings; promote a rule to `error` once its offenders are cleaned up.

import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';

// Flat config validates a rule's plugin prefix against the plugins declared in
// the *same* config object, so the custom block below — which sets react/* and
// react-hooks/* severities — must register those plugins itself. Reuse the exact
// instances eslint-config-next already loaded (in its react/react-hooks block)
// rather than re-importing: a different instance would throw "Cannot redefine
// plugin" when both objects match the same file, and this avoids depending on a
// transitive package directly. ponytail: hard-fails loudly at load if next ever
// drops these, which is the same break we're fixing — no silent fallback needed.
const nextPlugins = nextCoreWebVitals.find((c) => c.plugins?.react)?.plugins ?? {};

export default [
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      '.open-next/**',
      '.wrangler/**',
      // .claude/ holds local tooling state — git worktrees (each a full
      // checkout with its own build artifacts), launch config, etc. Never
      // project source, and recursing into worktree dist bundles OOMs ESLint.
      '.claude/**',
      'drizzle/**',
      // public/ is static assets (incl. generated WASM glue like
      // mayfly/ggwave.js) — never hand-edited, never linted.
      'public/**',
      'righteous-font/**',
      'searider-falcon-font/**',
      'patches/**',
      // The room relay is a separate JS Worker package with its own runtime
      // globals and toolchain — lint it in workers/room as a follow-up.
      'workers/**',
      // Native Capacitor shell: generated iOS/Android projects + loading webDir.
      'native/**',
      'ios/**',
      'android/**',
      '*.config.mjs',
      '*.config.ts',
      '*.config.js',
      'next-env.d.ts',
    ],
  },
  ...nextCoreWebVitals,
  eslintConfigPrettier,
  {
    plugins: {
      react: nextPlugins.react,
      'react-hooks': nextPlugins['react-hooks'],
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2022,
        ...globals.serviceworker,
      },
    },
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-var': 'error',
      'prefer-const': 'warn',
      'no-throw-literal': 'error',
      'react/jsx-key': 'error',
      'react/no-danger': 'warn',
      'react/no-unescaped-entities': 'warn',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // React Compiler-style rules introduced by react-hooks v6 (bundled with
      // eslint-config-next 16). They surface legitimate React-19 best practices
      // but flag many pre-existing call sites on a first scan. Demoted to warn
      // to keep CI green; address the findings incrementally and promote each
      // rule back to error once its file set is clean.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
    },
  },
];
