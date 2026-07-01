// barycal E2E config — delegated to the shared @edjshen/e2e-kit factory.
// The factory bakes in the setup-project auth (storageState), device matrix,
// shard-aware reporting, trace-on-first-retry and tag gating. Only the
// app-specific bits (base URL, dev server, which devices, the auth state file)
// are declared here.
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
    timeout: 120_000,
  },
});
