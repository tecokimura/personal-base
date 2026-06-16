'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { api, type EmployeeListItem, type MeResponse, type OrganizationView } from '@/lib/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function EmployeesPage() {
  const router = useRouter();
  const { loading: authLoading } = useAuth();
  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationView[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

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
    if (!fullName.trim()) { setFormError('氏名は必須です'); return; }
    if (organizationId && !startDate) { setFormError('組織を選択した場合は着任日が必須です'); return; }
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

  if (authLoading || loading) return <p className="text-sm text-muted-foreground">読み込み中...</p>;
  if (error) return <p className="text-sm text-destructive">{error}</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">社員一覧</h1>
        {isHrAdmin && (
          <div className="flex items-center gap-2">
            <Link href="/employees/deleted" className="text-sm text-muted-foreground hover:underline">
              削除済み社員を見る
            </Link>
            {!addingEmployee && (
              <Button size="sm" onClick={() => setAddingEmployee(true)}>社員を追加</Button>
            )}
          </div>
        )}
      </div>

      {isHrAdmin && addingEmployee && (
        <Card className="max-w-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">新規社員登録</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-3">
              {formError && <p className="text-sm text-destructive">{formError}</p>}
              <div className="space-y-1.5">
                <Label htmlFor="fullName">氏名 <span className="text-destructive">*</span></Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="例: 山田 太郎"
                  required
                  disabled={saving}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="employeeNumber">社員番号</Label>
                <Input
                  id="employeeNumber"
                  value={employeeNumber}
                  onChange={(e) => setEmployeeNumber(e.target.value)}
                  placeholder="例: EMP-001"
                  disabled={saving}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="organizationId">所属組織</Label>
                <select
                  id="organizationId"
                  value={organizationId}
                  onChange={(e) => setOrganizationId(e.target.value)}
                  disabled={saving}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">— 選択しない —</option>
                  {organizations.filter((o) => o.isActive).map((o) => (
                    <option key={o.id} value={String(o.id)}>{o.organizationName}</option>
                  ))}
                </select>
              </div>
              {organizationId && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="employmentType">雇用区分 <span className="text-destructive">*</span></Label>
                    <select
                      id="employmentType"
                      value={employmentType}
                      onChange={(e) => setEmploymentType(e.target.value)}
                      disabled={saving}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="1">正社員</option>
                      <option value="2">契約社員</option>
                      <option value="3">パート・アルバイト</option>
                      <option value="4">派遣社員</option>
                      <option value="5">業務委託</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="startDate">着任日 <span className="text-destructive">*</span></Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                      disabled={saving}
                    />
                  </div>
                </>
              )}
              <div className="flex gap-2 pt-1">
                <Button type="submit" disabled={saving}>
                  {saving ? '登録中...' : '登録'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm} disabled={saving}>
                  キャンセル
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">ID</TableHead>
              <TableHead className="w-28">社員番号</TableHead>
              <TableHead>氏名</TableHead>
              <TableHead>よみ・英語名</TableHead>
              <TableHead>メール</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  データなし
                </TableCell>
              </TableRow>
            ) : (
              employees.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{e.id}</TableCell>
                  <TableCell>{e.employeeNumber ?? '—'}</TableCell>
                  <TableCell>
                    <Link href={`/employees/${e.id}`} className="text-primary hover:underline">
                      {e.fullName}
                    </Link>
                  </TableCell>
                  <TableCell>{e.displayName ?? '—'}</TableCell>
                  <TableCell>{e.email ?? '—'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
