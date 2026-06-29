import { describe, it, expect } from 'vitest';
import { nextAalAfterPassword } from './superadmin';

describe('nextAalAfterPassword', () => {
  it('stays aal1 when the account has confirmed MFA (step-up required)', () => {
    expect(nextAalAfterPassword(true)).toBe('aal1');
  });
  it('jumps to aal2 when there is no MFA (normal users unaffected)', () => {
    expect(nextAalAfterPassword(false)).toBe('aal2');
  });
});
