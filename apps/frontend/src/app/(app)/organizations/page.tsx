'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { api, type OrganizationView } from '@/lib/api';

export default function OrganizationsPage() {
  const { loading: authLoading } = useAuth();
  const [orgs, setOrgs] = useState<OrganizationView[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    api.organizations
      .list()
      .then(setOrgs)
      .catch((err: unknown) => setError(String(err)))
      .finally(() => setLoading(false));
  }, [authLoading]);

  if (authLoading || loading) return <p>読み込み中...</p>;
  if (error) return <p className="error-msg">{error}</p>;

  return (
    <>
      <h1 className="page-title">組織一覧</h1>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>組織名</th>
              <th>コード</th>
              <th>親組織 ID</th>
              <th>表示順</th>
              <th>状態</th>
            </tr>
          </thead>
          <tbody>
            {orgs.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: '#aaa' }}>データなし</td></tr>
            ) : (
              orgs.map((o) => (
                <tr key={o.id}>
                  <td>{o.id}</td>
                  <td>
                    <Link href={`/org-chart`}>{o.organizationName}</Link>
                  </td>
                  <td>{o.organizationCode ?? '—'}</td>
                  <td>{o.parentOrganizationId ?? '—'}</td>
                  <td>{o.displayOrder}</td>
                  <td>
                    <span className={o.isActive ? 'badge badge-green' : 'badge badge-gray'}>
                      {o.isActive ? '有効' : '無効'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
