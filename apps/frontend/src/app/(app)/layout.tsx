'use client';

import Link from 'next/link';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-title">PersonalBase</div>
        <nav>
          <Link href="/dashboard">ダッシュボード</Link>
          <Link href="/organizations">組織一覧</Link>
          <Link href="/org-chart">組織図</Link>
          <Link href="/employees">社員一覧</Link>
        </nav>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
