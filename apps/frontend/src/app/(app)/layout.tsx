'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePathname } from 'next/navigation';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { me } = useAuth();
  const pathname = usePathname();
  const isHrAdmin = me?.roleTypes.includes(1) ?? false;
  const [orgOpen, setOrgOpen] = useState(true);
  const [accountOpen, setAccountOpen] = useState(true);

  if (me?.twoFactorPending || pathname?.startsWith('/2fa')) {
    return <>{children}</>;
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-title">PersonalBase</div>
        <nav>
          <Link href="/dashboard">ダッシュボード</Link>
          <div className="nav-group">
            <button
              className="nav-group-header"
              onClick={() => setOrgOpen(v => !v)}
            >
              組織図
              <span className="nav-group-arrow">{orgOpen ? '▾' : '▸'}</span>
            </button>
            {orgOpen && (
              <div className="nav-group-children">
                <Link href="/organizations">組織一覧</Link>
                <Link href="/employees">社員一覧</Link>
              </div>
            )}
          </div>
          {isHrAdmin && <Link href="/employees/deleted">削除済み社員</Link>}
          {isHrAdmin && <Link href="/audit">監査ログ</Link>}
          {isHrAdmin && <Link href="/settings">テナント設定</Link>}
          <div className="nav-divider" />
          {me?.employeeId && (
            <div className="nav-group">
              <button
                className="nav-group-header"
                onClick={() => setAccountOpen(v => !v)}
              >
                アカウント
                <span className="nav-group-arrow">{accountOpen ? '▾' : '▸'}</span>
              </button>
              {accountOpen && (
                <div className="nav-group-children">
                  <Link href={`/employees/${me.employeeId}`}>マイプロフィール</Link>
                  <Link href="/account/security">セキュリティ設定</Link>
                </div>
              )}
            </div>
          )}
        </nav>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
