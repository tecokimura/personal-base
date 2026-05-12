'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api, type AuditEvent, ApiError } from '@/lib/api';

export default function AuditPage() {
  const { me, loading: authLoading } = useAuth();
  const [events, setEvents] = useState<AuditEvent[] | null>(null);
  const [error, setError] = useState('');

  const isHrAdmin = !!me && me.roleTypes.includes(1);

  useEffect(() => {
    if (authLoading) return;
    if (!isHrAdmin) return;

    api.audit
      .listEvents()
      .then(setEvents)
      .catch((err: unknown) => {
        setError(
          err instanceof ApiError && err.status === 403
            ? 'この画面を閲覧する権限がありません'
            : '監査ログの取得に失敗しました',
        );
      });
  }, [authLoading, isHrAdmin]);

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
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>発生日時</th>
                  <th>種別</th>
                  <th>実行者 ID</th>
                  <th>対象 ID</th>
                  <th>対象種別</th>
                  <th>操作種別</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev, i) => (
                  <tr key={i}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {new Date(ev.occurredAt).toLocaleString('ja-JP')}
                    </td>
                    <td>
                      <span className={ev.eventType === 'LOGIN' ? 'badge badge-green' : 'badge badge-gray'}>
                        {ev.eventType}
                      </span>
                    </td>
                    <td>{ev.actorEmployeeId}</td>
                    <td>{ev.targetEmployeeId ?? '—'}</td>
                    <td>{ev.targetType ?? '—'}</td>
                    <td>{ev.operationType}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
