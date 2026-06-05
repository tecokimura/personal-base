'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { api, type DeletedEmployeeItem } from '@/lib/api';

export default function DeletedEmployeesPage() {
  const { me, loading: authLoading } = useAuth();
  const [employees, setEmployees] = useState<DeletedEmployeeItem[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [confirmingRestoreId, setConfirmingRestoreId] = useState<number | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState('');

  const isHrAdmin = me?.roleTypes.includes(1) ?? false;

  useEffect(() => {
    if (authLoading) return;
    api.employees
      .listDeleted()
      .then(setEmployees)
      .catch((err: unknown) => setError(String(err)))
      .finally(() => setLoading(false));
  }, [authLoading]);

  async function handleRestore(id: number) {
    setRestoring(true);
    setRestoreError('');
    try {
      await api.employees.restore(id);
      setEmployees((prev) => prev.filter((e) => e.id !== id));
      setConfirmingRestoreId(null);
    } catch (err) {
      setRestoreError(String(err));
    } finally {
      setRestoring(false);
    }
  }

  if (authLoading || loading) return <p>読み込み中...</p>;
  if (!isHrAdmin) return <p className="error-msg">このページは HR_ADMIN のみアクセスできます。</p>;
  if (error) return <p className="error-msg">{error}</p>;

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Link href="/employees">← 社員一覧へ戻る</Link>
      </div>
      <h1 className="page-title">削除済み社員</h1>

      {restoreError && <p className="error-msg" style={{ marginBottom: 12 }}>{restoreError}</p>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>社員番号</th>
              <th>氏名</th>
              <th>削除日</th>
              <th>最終所属</th>
              <th>在籍期間</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: '#aaa' }}>削除済み社員なし</td></tr>
            ) : (
              employees.map((e) => {
                const lastEmp = e.employments?.[0];
                return (
                  <tr key={e.id}>
                    <td>{e.id}</td>
                    <td>{e.employeeNumber ?? '—'}</td>
                    <td>{e.fullName}</td>
                    <td>{e.deletedAt ? new Date(e.deletedAt).toLocaleDateString('ja-JP') : '—'}</td>
                    <td>{lastEmp?.organization.organizationName ?? '—'}</td>
                    <td>
                      {lastEmp
                        ? `${new Date(lastEmp.startDate).toLocaleDateString('ja-JP')} 〜 ${lastEmp.endDate ? new Date(lastEmp.endDate).toLocaleDateString('ja-JP') : ''}`
                        : '—'}
                    </td>
                    <td>
                      {confirmingRestoreId === e.id ? (
                        <span style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 12 }}>復元しますか？</span>
                          <button
                            className="btn-primary"
                            style={{ fontSize: 11 }}
                            onClick={() => { void handleRestore(e.id); }}
                            disabled={restoring}
                          >
                            {restoring ? '復元中...' : '確認'}
                          </button>
                          <button
                            className="btn-secondary"
                            style={{ fontSize: 11 }}
                            onClick={() => { setConfirmingRestoreId(null); setRestoreError(''); }}
                            disabled={restoring}
                          >
                            キャンセル
                          </button>
                        </span>
                      ) : (
                        <button
                          className="btn-secondary"
                          style={{ fontSize: 12 }}
                          onClick={() => { setConfirmingRestoreId(e.id); setRestoreError(''); }}
                        >
                          復元
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
