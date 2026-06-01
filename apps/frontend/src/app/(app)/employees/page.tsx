'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { api, type EmployeeListItem, type MeResponse, type OrganizationView } from '@/lib/api';

export default function EmployeesPage() {
  const router = useRouter();
  const { loading: authLoading } = useAuth();
  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationView[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Form state
  const [addingEmployee, setAddingEmployee] = useState(false);
  const [fullName, setFullName] = useState('');
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [organizationId, setOrganizationId] = useState('');
  const [employmentType, setEmploymentType] = useState('1');
  const [startDate, setStartDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    Promise.all([
      api.employees.list(),
      api.auth.me(),
      api.organizations.list(),
    ])
      .then(([emps, meData, orgs]) => {
        setEmployees(emps);
        setMe(meData);
        setOrganizations(orgs);
      })
      .catch((err: unknown) => setError(String(err)))
      .finally(() => setLoading(false));
  }, [authLoading]);

  const isHrAdmin = me?.roleTypes.includes(1) ?? false;

  function resetForm() {
    setFullName('');
    setEmployeeNumber('');
    setOrganizationId('');
    setEmploymentType('1');
    setStartDate('');
    setFormError('');
    setAddingEmployee(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) {
      setFormError('氏名は必須です');
      return;
    }
    if (organizationId && !startDate) {
      setFormError('組織を選択した場合は着任日が必須です');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      const created = await api.employees.create({
        fullName: fullName.trim(),
        ...(employeeNumber.trim() ? { employeeNumber: employeeNumber.trim() } : {}),
      });

      if (organizationId) {
        await api.employees.addEmployment(created.id, {
          organizationId: Number(organizationId),
          employmentType: Number(employmentType),
          startDate,
        });
      }

      router.push(`/employees/${created.id}`);
    } catch (err: unknown) {
      setFormError(String(err));
      setSaving(false);
    }
  }

  if (authLoading || loading) return <p>読み込み中...</p>;
  if (error) return <p className="error-msg">{error}</p>;

  return (
    <>
      <h1 className="page-title">社員一覧</h1>

      {isHrAdmin && (
        <div style={{ marginBottom: '1rem' }}>
          {!addingEmployee ? (
            <button className="btn-primary" onClick={() => setAddingEmployee(true)}>
              社員を追加
            </button>
          ) : (
            <form onSubmit={handleSubmit} style={{ border: '1px solid #ddd', borderRadius: 6, padding: '1rem', maxWidth: 480 }}>
              <h2 style={{ marginTop: 0, fontSize: '1rem' }}>新規社員登録</h2>
              {formError && <p className="error-msg" style={{ marginBottom: '0.5rem' }}>{formError}</p>}

              <div className="form-row">
                <label>氏名 <span style={{ color: 'red' }}>*</span></label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="例: 山田 太郎"
                  required
                  disabled={saving}
                />
              </div>

              <div className="form-row">
                <label>社員番号</label>
                <input
                  value={employeeNumber}
                  onChange={(e) => setEmployeeNumber(e.target.value)}
                  placeholder="例: EMP-001"
                  disabled={saving}
                />
              </div>

              <div className="form-row">
                <label>所属組織</label>
                <select
                  value={organizationId}
                  onChange={(e) => setOrganizationId(e.target.value)}
                  disabled={saving}
                >
                  <option value="">— 選択しない —</option>
                  {organizations.filter((o) => o.isActive).map((o) => (
                    <option key={o.id} value={String(o.id)}>{o.organizationName}</option>
                  ))}
                </select>
              </div>

              {organizationId && (
                <>
                  <div className="form-row">
                    <label>雇用区分 <span style={{ color: 'red' }}>*</span></label>
                    <select
                      value={employmentType}
                      onChange={(e) => setEmploymentType(e.target.value)}
                      disabled={saving}
                    >
                      <option value="1">正社員</option>
                      <option value="2">契約社員</option>
                      <option value="3">パート・アルバイト</option>
                      <option value="4">派遣社員</option>
                      <option value="5">業務委託</option>
                    </select>
                  </div>

                  <div className="form-row">
                    <label>着任日 <span style={{ color: 'red' }}>*</span></label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                      disabled={saving}
                    />
                  </div>
                </>
              )}

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? '登録中...' : '登録'}
                </button>
                <button type="button" className="btn-secondary" onClick={resetForm} disabled={saving}>
                  キャンセル
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>社員番号</th>
              <th>氏名</th>
              <th>よみ・英語名</th>
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
