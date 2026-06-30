/**
 * Pure logic for the daily push-reminder digest. No DB / no network here so it's
 * unit-tested in isolation (mirrors lib/domain/regulars.ts); the cron route
 * (app/api/cron/reminders/route.ts) feeds it rows from D1 and sends the results.
 */
import type { BarycalEvent, Attendance } from '@/lib/db/schema';

const ATTENDING = new Set(['going', 'down', 'maybe']);

export interface DailyDigest {
  userId: string;
  title: string;
  body: string;
}

/**
 * One push digest per user for the events they're attending in `events` (the
 * caller scopes that set to "today"). Cancelled events are dropped; only
 * going/down/maybe RSVPs count. Titles keep attendance order and are de-duped.
 */
export function buildDailyDigests({
  events,
  attendance,
}: {
  events: Pick<BarycalEvent, 'id' | 'title' | 'cancelled'>[];
  attendance: Pick<Attendance, 'eventId' | 'userId' | 'rsvp'>[];
}): DailyDigest[] {
  const titleById = new Map<string, string>();
  for (const e of events) {
    if (!e.cancelled) titleById.set(e.id, e.title);
  }

  // userId -> de-duped list of titles they're attending today.
  const byUser = new Map<string, string[]>();
  for (const a of attendance) {
    if (!ATTENDING.has(a.rsvp)) continue;
    const title = titleById.get(a.eventId);
    if (!title) continue;
    const list = byUser.get(a.userId) ?? [];
    if (!list.includes(title)) list.push(title);
    byUser.set(a.userId, list);
  }

  const digests: DailyDigest[] = [];
  for (const [userId, titles] of byUser) {
    if (titles.length === 0) continue;
    const body =
      titles.length === 1 ? titles[0] : `${titles.length} things today: ${titles.join(', ')}`;
    digests.push({ userId, title: 'Today on Barycal', body });
  }
  return digests;
}
