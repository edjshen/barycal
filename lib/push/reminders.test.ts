import { describe, it, expect } from 'vitest';
import { buildDailyDigests } from './reminders';

const events = [
  { id: 'e1', title: 'Coffee', cancelled: false },
  { id: 'e2', title: 'Run', cancelled: false },
  { id: 'e3', title: 'Scrapped thing', cancelled: true },
];

describe('buildDailyDigests', () => {
  it('returns nothing when no one is attending', () => {
    expect(buildDailyDigests({ events: events as any, attendance: [] })).toEqual([]);
  });

  it('builds a single-item digest', () => {
    const out = buildDailyDigests({
      events: events as any,
      attendance: [{ eventId: 'e1', userId: 'ed', rsvp: 'going' }] as any,
    });
    expect(out).toEqual([{ userId: 'ed', title: 'Today on Barycal', body: 'Coffee' }]);
  });

  it('summarizes multiple events for one user', () => {
    const out = buildDailyDigests({
      events: events as any,
      attendance: [
        { eventId: 'e1', userId: 'ed', rsvp: 'going' },
        { eventId: 'e2', userId: 'ed', rsvp: 'maybe' },
      ] as any,
    });
    expect(out).toEqual([
      { userId: 'ed', title: 'Today on Barycal', body: '2 things today: Coffee, Run' },
    ]);
  });

  it('drops cancelled events', () => {
    const out = buildDailyDigests({
      events: events as any,
      attendance: [{ eventId: 'e3', userId: 'ed', rsvp: 'going' }] as any,
    });
    expect(out).toEqual([]);
  });

  it("ignores 'cant' RSVPs", () => {
    const out = buildDailyDigests({
      events: events as any,
      attendance: [{ eventId: 'e1', userId: 'ed', rsvp: 'cant' }] as any,
    });
    expect(out).toEqual([]);
  });

  it('produces one digest per user', () => {
    const out = buildDailyDigests({
      events: events as any,
      attendance: [
        { eventId: 'e1', userId: 'ed', rsvp: 'going' },
        { eventId: 'e2', userId: 'maya', rsvp: 'down' },
      ] as any,
    });
    expect(out).toHaveLength(2);
    expect(out.find((d) => d.userId === 'maya')!.body).toBe('Run');
  });
});
