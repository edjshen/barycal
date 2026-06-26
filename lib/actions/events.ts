'use server';
import { revalidatePath } from 'next/cache';
import { eq, and } from 'drizzle-orm';
import { getDb } from '../db';
import { events, attendance } from '../db/schema';
import { requireUserId } from '../auth/session';
import { getEventById, getAllConnections, getAllPlacements } from '../db/queries';
import { canSeeContent } from '../domain/visibility';
import { EVENT_TYPES } from '../domain/types';
import { clampStr, oneOf, toISOOrThrow, LIMITS } from '../validate';

const VIS = ['inner', 'orbit', 'public'] as const;
const RSVPS = ['going', 'down', 'maybe', 'cant'] as const;

export async function createEvent(input: { type: string; title: string; location?: string; startTime: string; endTime?: string | null; recurring?: 'weekly' | null; visibility: string; expiresAt?: string | null; }) {
  const uid = await requireUserId();
  const title = clampStr(input.title, LIMITS.title).trim();
  if (!title || !input.startTime) throw new Error('Title and start time required');
  const id = crypto.randomUUID(); const nowISO = new Date().toISOString();
  await getDb().insert(events).values({
    id, creatorId: uid,
    type: oneOf(input.type, EVENT_TYPES, 'event'),
    title, description: '', location: clampStr(input.location, LIMITS.location),
    startTime: toISOOrThrow(input.startTime, 'start time'),
    endTime: input.endTime ? toISOOrThrow(input.endTime, 'end time') : null,
    recurring: input.recurring === 'weekly' ? 'weekly' : null,
    visibility: oneOf(input.visibility, VIS, 'inner'),
    expiresAt: input.expiresAt ? toISOOrThrow(input.expiresAt, 'expiry') : null,
    createdAt: nowISO,
  });
  await getDb().insert(attendance).values({ id: crypto.randomUUID(), eventId: id, userId: uid, rsvp: 'going', createdAt: nowISO });
  revalidatePath('/plans'); revalidatePath('/discover'); return { id };
}

export async function setRsvp(eventId: string, rsvp: 'going' | 'down' | 'maybe' | 'cant') {
  const uid = await requireUserId();
  if (typeof eventId !== 'string' || !(RSVPS as readonly string[]).includes(rsvp)) throw new Error('Bad request');
  const ev = await getEventById(eventId);
  if (!ev) throw new Error('Not found');
  const [conns, places] = [await getAllConnections(), await getAllPlacements()];
  if (!canSeeContent(uid, ev, conns, places)) throw new Error('Private');
  const existing = (await getDb().select().from(attendance).where(and(eq(attendance.eventId, eventId), eq(attendance.userId, uid))).limit(1))[0];
  if (existing) await getDb().update(attendance).set({ rsvp }).where(eq(attendance.id, existing.id));
  else await getDb().insert(attendance).values({ id: crypto.randomUUID(), eventId, userId: uid, rsvp, createdAt: new Date().toISOString() });
  revalidatePath('/discover'); revalidatePath('/plans');
}

export async function deleteEvent(eventId: string) {
  const uid = await requireUserId();
  if (typeof eventId !== 'string') throw new Error('Bad request');
  const ev = await getEventById(eventId);
  if (!ev || ev.creatorId !== uid) throw new Error('Not allowed');
  await getDb().delete(attendance).where(eq(attendance.eventId, eventId));
  await getDb().delete(events).where(eq(events.id, eventId));
  revalidatePath('/plans');
}
