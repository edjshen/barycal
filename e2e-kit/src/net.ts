// Deterministic, fast page loads: abort non-essential third-party traffic
// (map tiles, fonts, analytics, embeds) that we don't control and that only
// slows tests down. Aborted resources don't affect the UI under test.
import type { Page } from '@playwright/test';

export const THIRD_PARTY_PATTERNS = [
  'https://*.basemaps.cartocdn.com/**',
  'https://*.tile.openstreetmap.org/**',
  'https://unpkg.com/**',
  'https://*.youtube.com/**',
  'https://fonts.gstatic.com/**',
  'https://fonts.googleapis.com/**',
  'https://www.googletagmanager.com/**',
  'https://www.google-analytics.com/**',
];

export async function stubThirdParty(
  page: Page,
  patterns: string[] = THIRD_PARTY_PATTERNS
): Promise<void> {
  for (const pattern of patterns) {
    await page.route(pattern, (route) => route.abort());
  }
}
