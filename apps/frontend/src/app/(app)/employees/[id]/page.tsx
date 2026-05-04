'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { api, type EmployeeDetail } from '@/lib/api';

const EMPLOYMENT_STATUS: Record<number, string> = { 1: '在籍', 2: '休職', 3: '退職' };
const EMPLOYMENT_TYPE: Record<number, string> = { 1: '主所属', 2: '兼務' };

export default function EmployeeDetailPage() {
  const { loading: authLoading } = useAuth();
  const params = useParams();
  const id = Number(params.id);
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !id) return;
    api.employees
      .get(id)
      .then(setEmployee)
      .catch((err: unknown) => setError(String(err)))
      .finally(() => setLoading(false));
  }, [authLoading, id]);

  if (authLoading || loading) return <p>読み込み中...</p>;
  if (error) return <p className="error-msg">{error}</p>;
  if (!employee) return null;

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Link href="/employees">← 社員一覧へ戻る</Link>
      </div>
      <h1 className="page-title">{employee.fullName}</h1>

      <div className="card">
        <h2 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px', color: '#555' }}>基本情報</h2>
        <dl style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '8px 24px', margin: 0 }}>
          <dt style={{ color: '#888', fontSize: 12, fontWeight: 600 }}>社員 ID</dt>
          <dd style={{ margin: 0 }}>{employee.id}</dd>

          {employee.employeeNumber !== undefined && (
            <>
              <dt style={{ color: '#888', fontSize: 12, fontWeight: 600 }}>社員番号</dt>
              <dd style={{ margin: 0 }}>{employee.employeeNumber ?? '—'}</dd>
            </>
          )}

          <dt style={{ color: '#888', fontSize: 12, fontWeight: 600 }}>氏名</dt>
          <dd style={{ margin: 0 }}>{employee.fullName}</dd>

          <dt style={{ color: '#888', fontSize: 12, fontWeight: 600 }}>表示名</dt>
          <dd style={{ margin: 0 }}>{employee.displayName ?? '—'}</dd>

          <dt style={{ color: '#888', fontSize: 12, fontWeight: 600 }}>メール</dt>
          <dd style={{ margin: 0 }}>{employee.email ?? '—'}</dd>

          {employee.birthDate !== undefined && (
            <>
              <dt style={{ color: '#888', fontSize: 12, fontWeight: 600 }}>生年月日</dt>
              <dd style={{ margin: 0 }}>{employee.birthDate ?? '—'}</dd>
            </>
          )}

          {employee.profileFreeText && (
            <>
              <dt style={{ color: '#888', fontSize: 12, fontWeight: 600 }}>プロフィール</dt>
              <dd style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{employee.profileFreeText}</dd>
            </>
          )}
        </dl>
      </div>

      <div className="card" style={{ marginTop: 8 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px', color: '#555' }}>所属情報</h2>
        {employee.employments.length === 0 ? (
          <p style={{ color: '#aaa', margin: 0 }}>所属なし</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>所属 ID</th>
                  <th>組織 ID</th>
                  <th>種別</th>
                  <th>役職</th>
                  <th>主所属</th>
                  <th>開始日</th>
                  <th>終了日</th>
                  <th>状態</th>
                </tr>
              </thead>
              <tbody>
                {employee.employments.map((emp) => (
                  <tr key={emp.id}>
                    <td>{emp.id}</td>
                    <td>{emp.organizationId}</td>
                    <td>{emp.employmentType !== undefined ? (EMPLOYMENT_TYPE[emp.employmentType] ?? emp.employmentType) : '—'}</td>
                    <td>{emp.positionName ?? '—'}</td>
                    <td>{emp.isPrimaryAssignment ? <span className="badge badge-green">主所属</span> : '—'}</td>
                    <td>{emp.startDate ? new Date(emp.startDate).toLocaleDateString('ja-JP') : '—'}</td>
                    <td>{emp.endDate ? new Date(emp.endDate).toLocaleDateString('ja-JP') : '—'}</td>
                    <td>
                      <span className={emp.status === 1 ? 'badge badge-green' : 'badge badge-gray'}>
                        {EMPLOYMENT_STATUS[emp.status] ?? emp.status}
                      </span>
                    </td>
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
