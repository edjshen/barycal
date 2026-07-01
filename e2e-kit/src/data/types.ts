/**
 * Provisions the backing store for a test run. Apps differ — Cloudflare D1
 * (barycal), a hermetic local Supabase (plur-nyc), a live QA tenant (poisys) —
 * so provisioning lives behind an adapter while specs stay backend-agnostic.
 */
export interface DataAdapter {
  /** Prepare schema + seed data BEFORE the app server boots. */
  provision(): Promise<void>;
  /** Optional: reset/truncate for determinism between runs. */
  reset?(): Promise<void>;
}
