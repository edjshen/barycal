import { getGraphContext, getEventsBetween } from './db/queries';
import { canSeeBusy, myConnectionIds } from './domain/visibility';
import { enrich } from './domain/enrich';

export async function calendarWindow(meId: string, startISO: string, endISO: string) {
  const ctx = await getGraphContext();
  const conns = myConnectionIds(ctx.conns, meId);
  // Ghost users disappear from others' calendars (the viewer's own events stay).
  const ghostIds = new Set(ctx.users.filter((u) => u.ghost && u.id !== meId).map((u) => u.id));
  const all = await getEventsBetween(startISO, endISO);
  return all
    .filter(
      (ev) =>
        !ghostIds.has(ev.creatorId) &&
        (ev.creatorId === meId ||
          ev.visibility === 'public' ||
          (conns.has(ev.creatorId) && canSeeBusy(meId, ev, ctx.conns, ctx.places)))
    )
    .map((ev) => enrich(ev, meId, ctx))
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
}
