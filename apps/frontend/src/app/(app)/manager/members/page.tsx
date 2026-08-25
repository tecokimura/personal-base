'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { api, type ManagerMember } from '@/lib/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function ManagerMembersPage() {
  const router = useRouter();
  const { me, loading: authLoading } = useAuth();
  const [members, setMembers] = useState<ManagerMember[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const isManager = me?.roleTypes.includes(2) ?? false;

  useEffect(() => {
    if (authLoading) return;

    if (me && !isManager) {
      router.replace('/dashboard');
      return;
    }

    api.manager
      .myMembers()
      .then(setMembers)
      .catch((err: unknown) => setError(String(err)))
      .finally(() => setLoading(false));
  }, [authLoading, me, isManager, router]);

  if (authLoading || loading) return <p className="text-sm text-muted-foreground">読み込み中...</p>;
  if (error) return <p className="text-sm text-destructive">{error}</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">管理メンバー一覧</h1>
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">社員番号</TableHead>
              <TableHead>氏名</TableHead>
              <TableHead>所属組織</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  データなし
                </TableCell>
              </TableRow>
            ) : (
              members.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{m.employeeNumber ?? '—'}</TableCell>
                  <TableCell>
                    <Link href={`/employees/${m.id}`} className="text-primary hover:underline">
                      {m.fullName}
                    </Link>
                  </TableCell>
                  <TableCell>{m.organizationName}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
