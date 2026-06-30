import { describe, it, expect } from 'vitest';
import { aesEncrypt, aesDecrypt } from './crypto';

const key = new Uint8Array(32).fill(7); // deterministic test key

describe('aesEncrypt/aesDecrypt — AES-GCM round trip', () => {
  it('decrypts what it encrypted', async () => {
    const enc = await aesEncrypt(key, 'JBSWY3DPEHPK3PXP');
    expect(enc).toMatch(/^[^:]+:[^:]+$/); // iv:ct, both base64
    expect(await aesDecrypt(key, enc)).toBe('JBSWY3DPEHPK3PXP');
  });
  it('produces a different ciphertext each call (random IV)', async () => {
    const a = await aesEncrypt(key, 'same');
    const b = await aesEncrypt(key, 'same');
    expect(a).not.toBe(b);
  });
  it('throws on a tampered ciphertext', async () => {
    const enc = await aesEncrypt(key, 'secret');
    const [iv, ct] = enc.split(':');
    const flipped = `${iv}:${ct.slice(0, -2)}AA`;
    await expect(aesDecrypt(key, flipped)).rejects.toBeDefined();
  });
  it('rejects a malformed stored value (no colon)', async () => {
    await expect(aesDecrypt(key, 'nocolonhere')).rejects.toThrow('malformed');
  });
});
