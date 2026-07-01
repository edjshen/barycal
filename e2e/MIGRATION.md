# E2E migration status

barycal's E2E suite is being moved onto the shared **`@edjshen/e2e-kit`** toolkit
(see `../e2e-kit/README.md`) and, for the first time, into CI. This tracks what's
converted and what's still pending.

## Test tiers (selected by tag)

| Tag                   | Runs                                                   | Gates merge?                                    |
| --------------------- | ------------------------------------------------------ | ----------------------------------------------- |
| `@smoke`, `@critical` | Every PR + push (`.github/workflows/e2e.yml` → `gate`) | **Yes**                                         |
| `@a11y`               | Every PR, **non-blocking** (`a11y` job)                | No — informational until violations are triaged |
| _(untagged legacy)_   | Not run in CI — dormant, pending rewrite               | No                                              |

Run locally:

```bash
npm run test:e2e        # the gate: @smoke + @critical (migrates + seeds local D1 first)
npm run test:e2e:a11y   # the axe scans
npm run test:e2e:report # open the last HTML report
```

## Converted (web-first, real UI, gating)

- `auth.setup.ts` — logs in once via `FormLoginAdapter`, saves `playwright/.auth/ed.json`.
- `01-landing-auth.spec.ts` — login form, wrong-credentials error, valid login reaches the authenticated shell, private-route redirect. Runs signed-out (`storageState: { cookies: [], origins: [] }`).
- `02-navigation.spec.ts` — real tab bar (Organizations / Regulars / Calendar / Profile); each destination navigates. Reuses the shared session.
- `08-profile.spec.ts` — `/you` shows the signed-in user (`@ed`) + Share/Edit/Log out; opening "Edit profile" reveals the edit form. Reuses the shared session.
- `10-public-pages.spec.ts` — account-free `/u/ed` renders with a sign-up CTA; unknown handle 404s. Runs signed-out.
- `a11y.spec.ts` — axe WCAG A/AA on the login page + calendar (`@a11y`, non-blocking).

## Backlog — legacy specs to convert (still untagged, not in CI)

`03-discover` · `04-calendar` · `05-create-event` · `06-circles` · `07-regulars` ·
`09-plans` · `11-ux-polish` · `12-rsvp` · `13-event-detail` · `14-mobile-ux` ·
`15-error-states`

These predate the kit and use the anti-patterns the kit exists to remove:

- **Soft assertions that can't fail** — `const ok = await x.isVisible().catch(() => false); expect(ok).toBeTruthy();`
- **Hard waits** — `await page.waitForTimeout(800)` and `waitForLoadState('networkidle')`.
- **Brittle selectors** — `[class*="CreateButton"]`, `button:has-text("+")`, `:visible`.
- **Vacuous/absent assertions** — e.g. asserting only `page.url()` contains `localhost`.
- **Stale routes** — reference folded tabs (`/plans`, `/circles`) no longer in the tab bar.

### Conversion recipe

1. Read the real component to get user-facing locators (`getByRole`/`getByLabel`/`getByText`).
2. Replace every soft check with a web-first assertion (`await expect(locator)...`).
3. Delete all `waitForTimeout` / `networkidle`; rely on auto-waiting.
4. Drop the inline `login()` — reuse the shared session (already authenticated), or
   opt out with `test.use({ storageState: { cookies: [], origins: [] } })` for auth-flow specs.
5. Tag `@smoke`/`@critical` (or `@extended` for broader, nightly coverage) and move it into the gate.
6. When a spec is converted, delete this entry.

### Turn on lint enforcement (after conversion)

Once the soft-assertion specs are gone, wire `eslint-plugin-playwright` into
`eslint.config.mjs` (see `../e2e-kit/README.md`) so the anti-patterns can't come
back. It is intentionally **not** enabled yet — it would flag the legacy specs above.
