'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { api, ApiError } from '@/lib/api';

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

  if (loading) return <p>読み込み中...</p>;
  if (!me) return null;

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 className="page-title" style={{ margin: 0 }}>ダッシュボード</h1>
        <button className="btn btn-sm" style={{ background: '#fee2e2', color: '#b91c1c' }} onClick={() => { void handleLogout(); }}>
          ログアウト
        </button>
      </div>

      <div className="card" style={{ background: '#f0f9ff', border: '1px solid #bae6fd', marginBottom: 8 }}>
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: '#0369a1', fontWeight: 600, marginBottom: 2 }}>テナント</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{me.tenantName} <span style={{ fontSize: 13, color: '#555', fontWeight: 400 }}>[{me.tenantId}]</span></div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#0369a1', fontWeight: 600, marginBottom: 2 }}>ログイン中の社員</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{me.employeeName} <span style={{ fontSize: 13, color: '#555', fontWeight: 400 }}>[{me.employeeNumber ?? '—'}]</span></div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px', color: '#555' }}>ログイン中のアカウント情報</h2>
        <dl className="kv" style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '6px 24px' }}>
          <dt>UserAccount ID</dt><dd>{me.id}</dd>
          <dt>テナント</dt><dd>{me.tenantName} [{me.tenantId}]</dd>
          <dt>社員</dt><dd>{me.employeeName} [{me.employeeNumber ?? '—'}]</dd>
          <dt>アカウント状態</dt><dd>
            <span className={me.status === 1 ? 'badge badge-green' : 'badge badge-gray'}>
              {me.status === 1 ? '有効' : '無効'}
            </span>
          </dd>
          <dt>最終ログイン</dt><dd>{me.lastLoggedInAt ? new Date(me.lastLoggedInAt).toLocaleString('ja-JP') : '—'}</dd>
        </dl>
      </div>

      <div className="card" style={{ marginTop: 8 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px', color: '#555' }}>クイックリンク</h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <a href="/organizations" className="btn btn-primary btn-sm">組織一覧</a>
          <a href="/org-chart" className="btn btn-primary btn-sm">組織図</a>
          <a href="/employees" className="btn btn-primary btn-sm">社員一覧</a>
          <a href={`/employees/${me.employeeId}`} className="btn btn-primary btn-sm">自分のプロフィール</a>
          <a href="/work-histories" className="btn btn-primary btn-sm">自分の職歴</a>
        </div>
      </div>

      <p style={{ marginTop: 24, fontSize: 12, color: '#aaa' }}>
        ※ 権限により表示されるデータが異なります（HR_ADMIN: 全社員、MANAGER: 配下社員、EMPLOYEE: 主所属同僚のみ）
      </p>
    </>
  );
}
