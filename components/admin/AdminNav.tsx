import Link from 'next/link';
export default function AdminNav() {
  return (
    <nav className="admin-nav" aria-label="Admin">
      <Link href="/admin">Overview</Link>
      <Link href="/admin/users">Users</Link>
      <Link href="/admin/moderation">Moderation</Link>
      <Link href="/admin/audit">Audit</Link>
    </nav>
  );
}
