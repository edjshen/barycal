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

setup('authenticate as demo user (ed)', async ({ page }) => {
  await barycalLogin.createStorageState({
    page,
    path: AUTH_FILE,
    credentials: { username: 'ed', password: 'barycal' },
  });
});
