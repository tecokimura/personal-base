'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { api, ApiError } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function DashboardPage() {
  const router = useRouter();
  const { me, loading } = useAuth();

  async function handleLogout() {
    try {
      await api.auth.logout();
    } catch (err) {
      if (!(err instanceof ApiError)) console.error(err);
    }
    router.replace('/login');
  }

  if (loading) return <p className="text-sm text-muted-foreground">読み込み中...</p>;
  if (!me) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="page-title" style={{ margin: 0 }}>ダッシュボード</h1>
        <Button variant="destructive" size="sm" onClick={() => { void handleLogout(); }}>
          ログアウト
        </Button>
      </div>

      {/* テナント・社員バナー */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-4">
          <div className="flex gap-8 flex-wrap items-center">
            <div>
              <p className="text-xs font-semibold text-blue-700 mb-0.5">テナント</p>
              <p className="text-base font-bold">
                {me.tenantName}{' '}
                <span className="text-sm font-normal text-muted-foreground">[{me.tenantId}]</span>
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-blue-700 mb-0.5">ログイン中の社員</p>
              <p className="text-base font-bold">
                {me.employeeName}{' '}
                <span className="text-sm font-normal text-muted-foreground">[{me.employeeNumber ?? '—'}]</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* アカウント情報 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground">ログイン中のアカウント情報</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="text-muted-foreground">UserAccount ID</dt><dd>{me.id}</dd>
            <dt className="text-muted-foreground">テナント</dt><dd>{me.tenantName} [{me.tenantId}]</dd>
            <dt className="text-muted-foreground">社員</dt><dd>{me.employeeName} [{me.employeeNumber ?? '—'}]</dd>
            <dt className="text-muted-foreground">アカウント状態</dt>
            <dd>
              <Badge variant={me.status === 1 ? 'default' : 'secondary'}>
                {me.status === 1 ? '有効' : '無効'}
              </Badge>
            </dd>
            <dt className="text-muted-foreground">最終ログイン</dt>
            <dd>{me.lastLoggedInAt ? new Date(me.lastLoggedInAt).toLocaleString('ja-JP') : '—'}</dd>
          </dl>
        </CardContent>
      </Card>

      {/* クイックリンク */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground">クイックリンク</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            <Link href="/organizations" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>組織一覧</Link>
            <Link href="/org-chart" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>組織図</Link>
            <Link href="/employees" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>社員一覧</Link>
            <Link href={`/employees/${me.employeeId}`} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>自分のプロフィール</Link>
            <Link href="/work-histories" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>自分の職歴</Link>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        ※ 権限により表示されるデータが異なります（HR_ADMIN: 全社員、MANAGER: 配下社員、EMPLOYEE: 主所属同僚のみ）
      </p>
    </div>
  );
}
