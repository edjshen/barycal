/**
 * Barycal push-reminder scheduler — a cron-only Cloudflare Worker (sibling of
 * barycal-room). Each scheduled tick pings the main app's /api/cron/reminders
 * route, bearer-authed with CRON_SECRET. The app route does the real work (query
 * D1, build digests, send FCM) so it can reuse the app's own db/query/send code;
 * OpenNext's generated worker can't host a scheduled() handler itself.
 */

async function runReminders(env) {
  if (!env.APP_URL || !env.CRON_SECRET) {
    console.error('[push-cron] APP_URL or CRON_SECRET not configured');
    return;
  }
  const res = await fetch(`${env.APP_URL}/api/cron/reminders`, {
    method: 'POST',
    headers: { authorization: `Bearer ${env.CRON_SECRET}` },
  });
  if (!res.ok) {
    console.error('[push-cron] reminders run failed', res.status, await res.text());
  }
}

export default {
  // Invoked by the Cron Triggers in wrangler.toml [triggers].
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runReminders(env));
  },
  // Trivial fetch handler so the worker is also manually pokeable / healthy.
  async fetch() {
    return new Response('barycal-push: cron only', { status: 200 });
  },
};
