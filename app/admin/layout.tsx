import { redirect } from 'next/navigation';
import Link from 'next/link';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth/session';
import { getDb } from '@/lib/db';
import { users } from '@/lib/db/schema';
import styles from './admin.module.css';

// barycal's FIRST admin surface. Gated server-side on every render: must have a
// session AND users.platformRole === 'admin'. (Each /admin server action ALSO
// re-checks via requireAdmin — the layout redirect is just UX, not the gate.)
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const s = await getSession();
  if (!s.userId) redirect('/login');

  const rows = await getDb()
    .select({ platformRole: users.platformRole })
    .from(users)
    .where(eq(users.id, s.userId))
    .limit(1);
  if (rows[0]?.platformRole !== 'admin') redirect('/');

  return (
    <div className={styles.shell}>
      <div className={styles.kick}>Platform admin</div>
      <nav className={styles.nav}>
        <Link href="/admin">Dashboard</Link>
        <Link href="/admin/perks">Perks</Link>
        <Link href="/admin/rules">Global rules</Link>
        <Link href="/admin/analytics">Analytics</Link>
        <Link href="/admin/moderation">Moderation</Link>
        <Link href="/admin/fulfillment">Fulfillment</Link>
      </nav>
      {children}
    </div>
  );
}
