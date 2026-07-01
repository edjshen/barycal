# @edjshen/e2e-kit

Shared, adapter-based Playwright E2E toolkit for the edjshen apps (**barycal**,
**plur-nyc**, **poisys**, and future add-ons). A _stable core_ everywhere +
_pluggable adapters_ for the only three axes on which the apps actually differ.

> **Status:** pilot. This package currently lives **inside barycal** and is
> consumed via a TypeScript path alias (no build step). It is written to lift
> verbatim into a dedicated `edjshen/e2e-kit` repo published to GitHub Packages —
> see [Extraction](#extraction-to-a-dedicated-repo) below.

## What's in it

**Core (identical across apps)**

| Export                              | Purpose                                                                                                                                                     |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createE2EConfig(options)`          | Playwright config factory — setup-project auth, device matrix, shard-aware reporting, `trace: on-first-retry`, tag gating via `E2E_GREP`/`E2E_GREP_INVERT`. |
| `test`, `expect`                    | Merged fixtures (`mergeTests`/`mergeExpects`): `makeAxe`, `stubThirdParty`.                                                                                 |
| `checkA11y(page, testInfo, opts?)`  | axe-core WCAG A/AA gate; attaches results to the report.                                                                                                    |
| `stubThirdParty(page)`              | Abort non-essential third-party traffic for deterministic loads.                                                                                            |
| `uniqueEmail/Name/Token/Xff/Suffix` | Collision-free per-test data.                                                                                                                               |

**Adapters (the seams)**

- **Auth** — `AuthAdapter` → `FormLoginAdapter` (cookie session). A localStorage-JWT
  adapter (poisys) drops in behind the same interface, because Playwright
  `storageState` carries both cookies _and_ per-origin localStorage.
- **Data** — `DataAdapter` → `D1LocalAdapter` (Cloudflare D1). Supabase
  admin/local adapters (plur-nyc, poisys) slot in the same way.

## Consuming it (barycal, today)

`playwright.config.ts`:

```ts
import { createE2EConfig } from '@edjshen/e2e-kit/config';

export default createE2EConfig({
  app: 'barycal',
  baseURL: 'http://localhost:3000',
  devices: ['desktop', 'mobile'],
  storageState: 'playwright/.auth/ed.json',
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

Resolution is a `tsconfig.json` path alias (`@edjshen/e2e-kit` → `./e2e-kit/src`)
that both `tsc` and Playwright honor — no build step. The kit's one runtime dep
(`@axe-core/playwright`) is installed in the host app's `devDependencies`.

## Conventions this kit encodes

- **User-facing locators** (`getByRole`/`getByLabel`/`getByText`) over CSS/XPath.
- **Web-first assertions only** — `await expect(locator)...`; never `waitForTimeout`
  or `.catch(() => false)` soft checks.
- **Log in once** via the `*.setup.ts` setup project → `storageState`; specs that
  test the auth flow itself opt out with `test.use({ storageState: { cookies: [], origins: [] } })`.
- **Tag tiers:** `@smoke`/`@critical` (PR gate), `@a11y`, `@extended` (nightly), `@quarantine`.

Enforce the assertion rules mechanically (recommended ESLint block for the host app):

```js
// eslint.config.mjs — requires: npm i -D eslint-plugin-playwright
import playwright from 'eslint-plugin-playwright';
export default [
  {
    files: ['e2e/**/*.{ts,spec.ts}'],
    ...playwright.configs['flat/recommended'],
    rules: {
      'playwright/no-conditional-in-test': 'error',
      'playwright/no-wait-for-timeout': 'error',
      'playwright/no-element-handle': 'error',
      'playwright/missing-playwright-await': 'error',
      'playwright/no-networkidle': 'error',
    },
  },
];
```

## Extraction to a dedicated repo

When ready to share across repos:

1. `git subtree split` (or copy) `barycal/e2e-kit/` into a new **`edjshen/e2e-kit`** repo.
2. Add a build (`tsup src/index.ts src/config.ts --format esm --dts`) and point
   `exports`/`types` at `dist/`. Keep `@playwright/test` a **peerDependency**.
3. Publish to **GitHub Packages**: add
   `"publishConfig": { "@edjshen:registry": "https://npm.pkg.github.com" }`,
   version with **Changesets**, prefer **OIDC trusted publishing** over a stored token.
4. In each consumer: `npm i -D @edjshen/e2e-kit`, drop the tsconfig path alias, and
   replace inline CI with the reusable `edjshen/ci-workflows/.github/workflows/e2e.yml@v1`.

See the full design doc for the reusable-workflow YAML and the plur-nyc/poisys
adapter mappings.
