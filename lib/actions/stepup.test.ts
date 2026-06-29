import { describe, it, expect, beforeEach, vi } from 'vitest';

const { state } = vi.hoisted(() => ({
  state: { session: {} as Record<string, unknown>, saved: false, secret: '', limitOk: true },
}));

vi.mock('../ratelimit', () => ({
  clientIp: async () => '1.2.3.4',
  consumeRateLimit: async () => ({ ok: state.limitOk }),
}));
vi.mock('../auth/session', () => ({
  getSession: async () => ({
    ...state.session,
    save: async () => {
      state.saved = true;
    },
  }),
}));
vi.mock('../auth/crypto', () => ({ decryptSecret: async (s: string) => s }));
vi.mock('../db/mfa-queries', () => ({
  getMfaCredential: async () => ({ secretEnc: state.secret, confirmedAt: 'x' }),
  consumeRecoveryCode: vi.fn(async () => false),
}));

import { verifyMfaStepUp } from './auth';
import * as OTPAuth from 'otpauth';

beforeEach(() => {
  state.session = { userId: 'ed', aal: 'aal1' };
  state.saved = false;
  state.limitOk = true;
  state.secret = new OTPAuth.Secret({ size: 20 }).base32;
});

describe('verifyMfaStepUp', () => {
  it('elevates aal1 → aal2 on a valid code', async () => {
    const live = new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(state.secret) }).generate();
    const r = await verifyMfaStepUp(live);
    expect(r.ok).toBe(true);
  });
  it('rejects a wrong code (stays aal1)', async () => {
    const r = await verifyMfaStepUp('000000');
    expect(r.ok).toBe(false);
  });
  it('rejects when rate-limited, even with a valid code', async () => {
    state.limitOk = false;
    const live = new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(state.secret) }).generate();
    expect((await verifyMfaStepUp(live)).ok).toBe(false);
  });
});
