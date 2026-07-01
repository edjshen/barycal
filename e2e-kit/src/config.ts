// Playwright config factory. A per-app playwright.config.ts shrinks to one
// call: this bakes in the shared batteries (setup-project auth via storageState,
// device matrix, shard-aware reporting, trace-on-first-retry, tag gating) so
// every app inherits the same conventions and only declares what differs.
import { existsSync } from 'node:fs';
import { defineConfig, devices, type PlaywrightTestConfig } from '@playwright/test';

// Mobile uses Pixel 5 (chromium-based) rather than a WebKit device so the whole
// matrix runs on the single chromium build that CI installs (`playwright install
// chromium`). Swap in a WebKit device + `playwright install webkit` if/when real
// Safari coverage is wanted.
const DEVICE_MAP = {
  desktop: { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  mobile: { name: 'mobile', use: { ...devices['Pixel 5'] } },
} as const;

export type DeviceKey = keyof typeof DEVICE_MAP;

export interface E2EConfigOptions {
  /** App name — used for labelling only. */
  app: string;
  baseURL: string;
  webServer?: PlaywrightTestConfig['webServer'];
  /** Device projects to run (default: desktop only). */
  devices?: DeviceKey[];
  /**
   * storageState file produced by the auth setup project. When set, a `setup`
   * project runs first and every device project reuses the saved session.
   * Omit for apps/suites that never need a pre-authenticated actor.
   */
  storageState?: string;
  /** Glob for the setup project (default: *.setup.ts). */
  setupMatch?: RegExp;
  testDir?: string;
  /** Escape hatch merged last. */
  overrides?: PlaywrightTestConfig;
}

// In the managed sandbox the browser lives at a fixed path; in real CI it's
// discovered via PLAYWRIGHT_BROWSERS_PATH, so only pin it when it exists.
const SANDBOX_CHROMIUM = '/opt/pw-browsers/chromium';

export function createE2EConfig(options: E2EConfigOptions): PlaywrightTestConfig {
  const {
    baseURL,
    webServer,
    devices: deviceKeys = ['desktop'],
    storageState,
    setupMatch = /.*\.setup\.ts/,
    testDir = './e2e',
    overrides = {},
  } = options;

  const ci = !!process.env.CI;
  const grep = process.env.E2E_GREP ? new RegExp(process.env.E2E_GREP) : undefined;
  const grepInvert = process.env.E2E_GREP_INVERT
    ? new RegExp(process.env.E2E_GREP_INVERT)
    : undefined;

  const launchOptions = existsSync(SANDBOX_CHROMIUM)
    ? { executablePath: SANDBOX_CHROMIUM }
    : undefined;
  const baseUse = launchOptions ? { launchOptions } : {};

  const deviceProjects = deviceKeys.map((key) => {
    const d = DEVICE_MAP[key];
    return {
      name: d.name,
      use: {
        ...d.use,
        ...baseUse,
        ...(storageState ? { storageState } : {}),
      },
      dependencies: storageState ? ['setup'] : [],
    };
  });

  const projects = [
    ...(storageState ? [{ name: 'setup', testMatch: setupMatch, use: baseUse }] : []),
    ...deviceProjects,
  ];

  return defineConfig({
    testDir,
    fullyParallel: false,
    forbidOnly: ci,
    retries: ci ? 2 : 1,
    workers: 1,
    timeout: 60_000,
    expect: { timeout: 10_000 },
    grep,
    grepInvert,
    reporter: ci ? [['blob'], ['list']] : [['html', { open: 'never' }], ['list']],
    use: {
      baseURL,
      trace: 'on-first-retry',
      screenshot: 'only-on-failure',
      video: 'retain-on-failure',
    },
    projects,
    webServer,
    ...overrides,
  });
}
