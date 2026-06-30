import { getMfaCredential } from '@/lib/db/mfa-queries';
import { getSession } from '@/lib/auth/session';
import MfaEnroll from '@/components/MfaEnroll';

export default async function SecurityPage() {
  const s = await getSession();
  const cred = s.userId ? await getMfaCredential(s.userId) : null;
  return (
    <main className="main">
      <h1>Security</h1>
      {cred?.confirmedAt ? <p>Two-factor authentication is on.</p> : <MfaEnroll />}
    </main>
  );
}
