// Accessibility scanning via axe-core. Wired as a reusable assertion so every
// app inherits the same WCAG A/AA gate. Note: axe catches ~57% of real issues
// by volume (Deque) — necessary, not sufficient; pair with manual keyboard/SR
// passes for the rest.
import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, type TestInfo } from '@playwright/test';

export const DEFAULT_WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

export interface CheckA11yOptions {
  /** Restrict the scan to a CSS selector (e.g. a dialog). */
  include?: string;
  /** Exclude a known-broken region without abandoning the page's coverage. */
  exclude?: string;
  tags?: string[];
  disableRules?: string[];
}

/**
 * Scan the current page state and assert zero violations. Attaches the full
 * axe result JSON to the report so failures show the exact offending nodes.
 * Scan AFTER the UI reaches the state under test — axe skips hidden regions.
 */
export async function checkA11y(
  page: Page,
  testInfo: TestInfo,
  options: CheckA11yOptions = {}
): Promise<void> {
  let builder = new AxeBuilder({ page }).withTags(options.tags ?? DEFAULT_WCAG_TAGS);
  if (options.include) builder = builder.include(options.include);
  if (options.exclude) builder = builder.exclude(options.exclude);
  if (options.disableRules?.length) builder = builder.disableRules(options.disableRules);

  const results = await builder.analyze();

  await testInfo.attach('axe-results', {
    body: JSON.stringify(results, null, 2),
    contentType: 'application/json',
  });

  const summary = results.violations
    .map((v) => `${v.id} (${v.impact}): ${v.help} — ${v.nodes.length} node(s)\n  ${v.helpUrl}`)
    .join('\n');

  expect(results.violations, `Accessibility violations found:\n${summary}`).toEqual([]);
}
