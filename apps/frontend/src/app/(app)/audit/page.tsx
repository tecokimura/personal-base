'use client';

import { useMemo, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api, type AuditEvent, type EmployeeListItem, ApiError } from '@/lib/api';

const PAGE_SIZE_OPTIONS = [50, 100, 200] as const;

function nameCell(id: number | null, nameMap: Map<number, string>): React.ReactNode {
  if (id == null) return '—';
  const name = nameMap.get(id);
  if (name) {
    return (
      <>
        {name}{' '}
        <span style={{ color: '#aaa', fontSize: 11 }}>(ID: {id})</span>
      </>
    );
  }
  return <span style={{ color: '#888' }}>ID: {id}</span>;
}

export default function AuditPage() {
  const { me, loading: authLoading } = useAuth();
  const [events, setEvents] = useState<AuditEvent[] | null>(null);
  const [nameMap, setNameMap] = useState<Map<number, string>>(new Map());
  const [error, setError] = useState('');
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(50);
  const [page, setPage] = useState(0);

  const isHrAdmin = !!me && me.roleTypes.includes(1);

  useEffect(() => {
    if (authLoading || !isHrAdmin) return;

    api.audit.listEvents().then(setEvents).catch((err: unknown) => {
      setError(
        err instanceof ApiError && err.status === 403
          ? 'この画面を閲覧する権限がありません'
          : '監査ログの取得に失敗しました',
      );
    });

    api.employees.list().then((emps: EmployeeListItem[]) => {
      const map = new Map<number, string>();
      for (const emp of emps) {
        map.set(emp.id, emp.displayName ?? emp.fullName);
      }
      setNameMap(map);
    }).catch(() => {});
  }, [authLoading, isHrAdmin]);

  const totalPages = events ? Math.ceil(events.length / pageSize) : 0;
  const pagedEvents = useMemo(
    () => events?.slice(page * pageSize, (page + 1) * pageSize) ?? [],
    [events, page, pageSize],
  );

  function handlePageSizeChange(newSize: (typeof PAGE_SIZE_OPTIONS)[number]) {
    setPageSize(newSize);
    setPage(0);
  }

  if (authLoading) return <p>読み込み中...</p>;
  if (!isHrAdmin) return <p className="error-msg">この画面は HR_ADMIN のみ利用できます</p>;
  if (error) return <p className="error-msg">{error}</p>;

  return (
    <>
      <h1 className="page-title">監査ログ</h1>
      <div className="card">
        {events === null ? (
          <p style={{ color: '#aaa', margin: 0 }}>読み込み中...</p>
        ) : events.length === 0 ? (
          <p style={{ color: '#aaa', margin: 0 }}>監査イベントはありません</p>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: '#888' }}>全 {events.length} 件</span>
              <label style={{ fontSize: 12, color: '#555', display: 'flex', alignItems: 'center', gap: 6 }}>
                表示件数:
                <select
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(Number(e.target.value) as (typeof PAGE_SIZE_OPTIONS)[number])}
                  style={{ fontSize: 12, padding: '2px 6px', border: '1px solid #ddd', borderRadius: 4 }}
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={n}>{n} 件</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>発生日時</th>
                    <th>種別</th>
                    <th>実行者</th>
                    <th>対象者</th>
                    <th>対象種別</th>
                    <th>操作種別</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedEvents.map((ev, i) => (
                    <tr key={i}>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {new Date(ev.occurredAt).toLocaleString('ja-JP')}
                      </td>
                      <td>
                        <span className={ev.eventType === 'LOGIN' ? 'badge badge-green' : 'badge badge-gray'}>
                          {ev.eventType}
                        </span>
                      </td>
                      <td>{nameCell(ev.actorEmployeeId, nameMap)}</td>
                      <td>{nameCell(ev.targetEmployeeId, nameMap)}</td>
                      <td>{ev.targetType ?? '—'}</td>
                      <td>{ev.operationType}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 12 }}>
                <button
                  className="btn-secondary"
                  style={{ fontSize: 12 }}
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 0}
                >
                  前へ
                </button>
                <span style={{ fontSize: 12, color: '#555' }}>
                  {page + 1} / {totalPages} ページ
                </span>
                <button
                  className="btn-secondary"
                  style={{ fontSize: 12 }}
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= totalPages - 1}
                >
                  次へ
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
