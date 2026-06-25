import { describe, it, expect } from 'vitest';
import { areConnected, myConnectionIds, connectionStatus, tierOf, canSeeContent, canSeeBusy } from './visibility';
import type { Connection, Placement } from '../db/schema';
import type { Visibility } from './types';

const conns: Connection[] = [
  { id: 'c1', aId: 'ed', bId: 'maya', status: 'accepted', requestedBy: 'ed', createdAt: '' },
  { id: 'c2', aId: 'jordan', bId: 'ed', status: 'pending', requestedBy: 'jordan', createdAt: '' },
];
const places: Placement[] = [{ id: 'p1', ownerId: 'ed', otherId: 'maya', tier: 'inner' }];
const ev = (over: Partial<{ creatorId: string; visibility: Visibility }> = {}) =>
  ({ creatorId: 'maya', visibility: 'inner' as Visibility, ...over });

describe('visibility', () => {
  it('areConnected: only accepted, either direction', () => {
    expect(areConnected(conns, 'ed', 'maya')).toBe(true);
    expect(areConnected(conns, 'maya', 'ed')).toBe(true);
    expect(areConnected(conns, 'ed', 'jordan')).toBe(false);
  });
  it('myConnectionIds: accepted partners of me', () => {
    expect([...myConnectionIds(conns, 'ed')]).toEqual(['maya']);
  });
  it('connectionStatus: none/connected/pending_in/pending_out', () => {
    expect(connectionStatus(conns, 'ed', 'maya')).toBe('connected');
    expect(connectionStatus(conns, 'ed', 'jordan')).toBe('pending_in');
    expect(connectionStatus(conns, 'jordan', 'ed')).toBe('pending_out');
    expect(connectionStatus(conns, 'ed', 'nobody')).toBe('none');
  });
  it('tierOf: owner→other placement or null', () => {
    expect(tierOf(places, 'ed', 'maya')).toBe('inner');
    expect(tierOf(places, 'maya', 'ed')).toBe(null);
  });
  it('canSeeContent: public always; self always; inner needs inner tier; orbit ok for any connection', () => {
    expect(canSeeContent('anyone', ev({ visibility: 'public' }), conns, places)).toBe(true);
    expect(canSeeContent('maya', ev({ creatorId: 'maya' }), conns, places)).toBe(true);
    expect(canSeeContent('ed', ev({ visibility: 'inner' }), conns, places)).toBe(true); // ed is inner of maya
    expect(canSeeContent('ed', ev({ visibility: 'orbit' }), conns, places)).toBe(true);
    expect(canSeeContent(null, ev({ visibility: 'inner' }), conns, places)).toBe(false);
    expect(canSeeContent('stranger', ev({ visibility: 'inner' }), conns, places)).toBe(false);
  });
  it('canSeeContent: inner event hidden from a connection placed only in orbit', () => {
    const orbitOnly: Placement[] = [{ id: 'p', ownerId: 'maya', otherId: 'theo', tier: 'orbit' }];
    const c: Connection[] = [{ id: 'c', aId: 'maya', bId: 'theo', status: 'accepted', requestedBy: 'maya', createdAt: '' }];
    expect(canSeeContent('theo', ev({ visibility: 'inner' }), c, orbitOnly)).toBe(false);
    expect(canSeeContent('theo', ev({ visibility: 'orbit' }), c, orbitOnly)).toBe(true);
  });
  it('canSeeBusy: content-visible OR connected', () => {
    expect(canSeeBusy('ed', ev({ visibility: 'inner' }), conns, places)).toBe(true);
    expect(canSeeBusy('stranger', ev({ visibility: 'inner' }), conns, places)).toBe(false);
  });
});
