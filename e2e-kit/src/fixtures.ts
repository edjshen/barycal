// The `test`/`expect` every spec imports. Composed with Playwright's official
// multi-module mechanism (mergeTests/mergeExpects) so concerns can be split
// across modules and combined here. Adds opt-in, side-effect-free fixtures:
//   makeAxe        — a preconfigured AxeBuilder factory (WCAG A/AA)
//   stubThirdParty — abort non-essential third-party traffic for this page
import AxeBuilder from '@axe-core/playwright';
import { test as base, mergeTests, mergeExpects, expect as baseExpect } from '@playwright/test';
import { DEFAULT_WCAG_TAGS } from './a11y';
import { stubThirdParty as stubThirdPartyOn } from './net';

type KitFixtures = {
  makeAxe: () => AxeBuilder;
  stubThirdParty: (patterns?: string[]) => Promise<void>;
};

// Note: the fixture value callback's 2nd arg is named `provide` (not the usual
// `use`) so eslint-plugin-react-hooks doesn't mistake it for React 19's `use`
// hook — Playwright passes it positionally, so the name is free.
const kitTest = base.extend<KitFixtures>({
  makeAxe: async ({ page }, provide) => {
    await provide(() => new AxeBuilder({ page }).withTags(DEFAULT_WCAG_TAGS));
  },
  stubThirdParty: async ({ page }, provide) => {
    await provide((patterns?: string[]) => stubThirdPartyOn(page, patterns));
  },
});

export const test = mergeTests(kitTest);
export const expect = mergeExpects(baseExpect);
