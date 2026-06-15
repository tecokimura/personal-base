'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { api, type DeletedEmployeeItem } from '@/lib/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';

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

  if (authLoading || loading) return <p className="text-sm text-muted-foreground">読み込み中...</p>;
  if (!isHrAdmin) return <p className="text-sm text-destructive">このページは HR_ADMIN のみアクセスできます。</p>;
  if (error) return <p className="text-sm text-destructive">{error}</p>;

  return (
    <div className="space-y-4">
      <Link href="/employees" className="text-sm text-muted-foreground hover:text-foreground">
        ← 社員一覧へ戻る
      </Link>
      <h1 className="text-xl font-semibold">削除済み社員</h1>

      {restoreError && <p className="text-sm text-destructive">{restoreError}</p>}

      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">ID</TableHead>
              <TableHead className="w-24">社員番号</TableHead>
              <TableHead>氏名</TableHead>
              <TableHead>削除日</TableHead>
              <TableHead>最終所属</TableHead>
              <TableHead>在籍期間</TableHead>
              <TableHead className="w-32">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  削除済み社員なし
                </TableCell>
              </TableRow>
            ) : (
              employees.map((e) => {
                const lastEmp = e.employments?.[0];
                return (
                  <TableRow key={e.id}>
                    <TableCell>{e.id}</TableCell>
                    <TableCell>{e.employeeNumber ?? '—'}</TableCell>
                    <TableCell>{e.fullName}</TableCell>
                    <TableCell>{e.deletedAt ? new Date(e.deletedAt).toLocaleDateString('ja-JP') : '—'}</TableCell>
                    <TableCell>{lastEmp?.organization.organizationName ?? '—'}</TableCell>
                    <TableCell>
                      {lastEmp
                        ? `${new Date(lastEmp.startDate).toLocaleDateString('ja-JP')} 〜 ${lastEmp.endDate ? new Date(lastEmp.endDate).toLocaleDateString('ja-JP') : ''}`
                        : '—'}
                    </TableCell>
                    <TableCell>
                      {confirmingRestoreId === e.id ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-muted-foreground">復元しますか？</span>
                          <Button
                            size="sm"
                            className="h-6 text-xs px-2"
                            onClick={() => { void handleRestore(e.id); }}
                            disabled={restoring}
                          >
                            {restoring ? '復元中...' : '確認'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-xs px-2"
                            onClick={() => { setConfirmingRestoreId(null); setRestoreError(''); }}
                            disabled={restoring}
                          >
                            キャンセル
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-xs px-2"
                          onClick={() => { setConfirmingRestoreId(e.id); setRestoreError(''); }}
                        >
                          復元
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
