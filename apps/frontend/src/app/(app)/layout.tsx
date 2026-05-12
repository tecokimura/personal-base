'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { me } = useAuth();
  const isHrAdmin = me?.roleTypes.includes(1) ?? false;

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-title">PersonalBase</div>
        <nav>
          <Link href="/dashboard">ダッシュボード</Link>
          <Link href="/organizations">組織一覧</Link>
          <Link href="/org-chart">組織図</Link>
          <Link href="/employees">社員一覧</Link>
          <Link href="/work-histories">職歴</Link>
          {isHrAdmin && <Link href="/audit">監査ログ</Link>}
        </nav>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
