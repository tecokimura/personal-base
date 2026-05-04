'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { api, type EmployeeListItem } from '@/lib/api';

export default function EmployeesPage() {
  const { loading: authLoading } = useAuth();
  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    api.employees
      .list()
      .then(setEmployees)
      .catch((err: unknown) => setError(String(err)))
      .finally(() => setLoading(false));
  }, [authLoading]);

  if (authLoading || loading) return <p>読み込み中...</p>;
  if (error) return <p className="error-msg">{error}</p>;

  return (
    <>
      <h1 className="page-title">社員一覧</h1>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>社員番号</th>
              <th>氏名</th>
              <th>表示名</th>
              <th>メール</th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: '#aaa' }}>データなし</td></tr>
            ) : (
              employees.map((e) => (
                <tr key={e.id}>
                  <td>{e.id}</td>
                  <td>{e.employeeNumber ?? '—'}</td>
                  <td>
                    <Link href={`/employees/${e.id}`}>{e.fullName}</Link>
                  </td>
                  <td>{e.displayName ?? '—'}</td>
                  <td>{e.email ?? '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
