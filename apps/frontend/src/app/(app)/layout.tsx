'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight } from 'lucide-react';

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      className={cn(
        'block px-4 py-2 text-sm rounded-md transition-colors',
        active
          ? 'bg-primary text-primary-foreground font-medium'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      {children}
    </Link>
  );
}

function NavGroup({
  label,
  children,
  defaultOpen = true,
}: {
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center justify-between px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        {label}
        {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
      </button>
      {open && <div className="pl-2 space-y-0.5">{children}</div>}
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { me } = useAuth();
  const pathname = usePathname();
  const isHrAdmin = me?.roleTypes.includes(1) ?? false;

  if (me?.twoFactorPending || pathname?.startsWith('/2fa')) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-52 shrink-0 border-r bg-white flex flex-col">
        <div className="px-4 py-5 border-b">
          <span className="text-sm font-bold tracking-wide text-foreground">PersonalBase</span>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
          <NavLink href="/dashboard">ダッシュボード</NavLink>

          <div className="pt-2">
            <NavGroup label="組織図">
              <NavLink href="/organizations">組織一覧</NavLink>
              <NavLink href="/employees">社員一覧</NavLink>
            </NavGroup>
          </div>

          {isHrAdmin && (
            <div className="space-y-0.5">
              <NavLink href="/employees/deleted">削除済み社員</NavLink>
              <NavLink href="/audit">監査ログ</NavLink>
              <NavLink href="/settings">テナント設定</NavLink>
            </div>
          )}

          {me?.employeeId && (
            <div className="pt-2">
              <NavGroup label="アカウント">
                <NavLink href={`/employees/${me.employeeId}`}>マイプロフィール</NavLink>
                <NavLink href="/account/security">セキュリティ設定</NavLink>
              </NavGroup>
            </div>
          )}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  );
}
