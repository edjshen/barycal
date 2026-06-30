import { notFound } from 'next/navigation';
import { requireSuperadmin } from '@/lib/auth/superadmin';
import AdminNav from '@/components/admin/AdminNav';

// Auth-gated, D1-backed admin area — always render per-request (the child pages
// read the DB, which isn't available during the build-time static prerender).
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireSuperadmin();
  } catch {
    notFound(); // don't reveal /superadmin exists to non-admins or aal1 (no-MFA-step-up) sessions
  }
  return (
    <div className="shell admin-shell">
      <AdminNav />
      <div className="main">{children}</div>
    </div>
  );
}
