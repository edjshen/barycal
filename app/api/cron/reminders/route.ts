/**
 * POST /api/cron/reminders
 *
 * Sends each user a single daily push digest of the events they're attending
 * today. Invoked by the standalone `barycal-push` cron Worker (workers/push/),
 * authenticated with a shared bearer secret — never called by browsers. The
 * scheduling lives in that Worker; the logic lives here so it can reuse the app's
 * own D1 queries (getEventsBetween / getAllAttendance) and FCM sender
 * (sendToUser) inside a real request context, which OpenNext's worker can't host
 * in a scheduled() handler.
 */
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getEventsBetween, getAllAttendance } from '@/lib/db/queries';
import { buildDailyDigests } from '@/lib/push/reminders';
import { sendToUser } from '@/lib/push/send';

// Constant-time compare (Workers has no crypto.timingSafeEqual). Length is
// allowed to leak — the secret is a long random token.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

function authorized(request: Request): boolean {
  const env = getCloudflareContext().env as unknown as { CRON_SECRET?: string };
  if (!env.CRON_SECRET) return false;
  const header = request.headers.get('authorization') ?? '';
  const prefix = 'Bearer ';
  return header.startsWith(prefix) && timingSafeEqual(header.slice(prefix.length), env.CRON_SECRET);
}

function endOfUtcDay(now: Date): string {
  const end = new Date(now);
  end.setUTCHours(23, 59, 59, 999);
  return end.toISOString();
}

export async function POST(request: Request): Promise<Response> {
  if (!authorized(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const [events, attendance] = await Promise.all([
    getEventsBetween(now.toISOString(), endOfUtcDay(now)),
    getAllAttendance(),
  ]);

  const digests = buildDailyDigests({ events, attendance });
  let usersNotified = 0;
  for (const d of digests) {
    const delivered = await sendToUser(d.userId, { title: d.title, body: d.body }).catch(() => 0);
    if (delivered > 0) usersNotified++;
  }

  return Response.json({
    ok: true,
    eventsConsidered: events.length,
    digests: digests.length,
    usersNotified,
  });
}
