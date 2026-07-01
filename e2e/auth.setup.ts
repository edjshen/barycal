import { test as setup } from '@playwright/test';
import { FormLoginAdapter } from '@edjshen/e2e-kit';

// Log in ONCE as the seeded demo user and persist the sealed `barycal_session`
// cookie to storageState. Every authenticated device project reuses this via
// its `dependencies: ['setup']` — no per-test login. Specs that exercise the
// auth flow itself opt out with an empty storageState.
const AUTH_FILE = 'playwright/.auth/ed.json';

const barycalLogin = new FormLoginAdapter({
  loginPath: '/login',
  usernameLabel: 'Username',
  passwordLabel: 'Password',
  submitName: /log ?in/i,
  expectUrl: /\/(discover|calendar|organizations|regulars|you)/,
});

// Tag the setup with every tier that depends on it so a config-level grep
// (E2E_GREP) never filters it out — otherwise the storageState is never written
// and authenticated specs fail with ENOENT on playwright/.auth/ed.json.
setup(
  'authenticate as demo user (ed)',
  { tag: ['@smoke', '@critical', '@a11y'] },
  async ({ page }) => {
    await barycalLogin.createStorageState({
      page,
      path: AUTH_FILE,
      credentials: { username: 'ed', password: 'barycal' },
    });
  }
);
