'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePathname } from 'next/navigation';

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      style={active ? {
        display: 'block',
        padding: '8px 20px',
        color: '#fff',
        fontSize: 13,
        background: 'rgba(255,255,255,0.12)',
        borderLeft: '3px solid #60a5fa',
        textDecoration: 'none',
      } : undefined}
      className={active ? undefined : 'sidebar-link'}
    >
      {children}
    </Link>
  );
}

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
          <NavLink href="/dashboard">ダッシュボード</NavLink>
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
                <NavLink href="/org-chart">組織図</NavLink>
                <NavLink href="/organizations">組織一覧</NavLink>
                <NavLink href="/employees">社員一覧</NavLink>
              </div>
            )}
          </div>
          {isHrAdmin && <NavLink href="/employees/deleted">削除済み社員</NavLink>}
          {isHrAdmin && <NavLink href="/audit">監査ログ</NavLink>}
          {isHrAdmin && <NavLink href="/settings">テナント設定</NavLink>}
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
                  <NavLink href={`/employees/${me.employeeId}`}>マイプロフィール</NavLink>
                  <NavLink href="/account/security">セキュリティ設定</NavLink>
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
