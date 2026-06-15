'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { api, type OrganizationView } from '@/lib/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

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

  if (authLoading || loading) return <p className="text-sm text-muted-foreground">読み込み中...</p>;
  if (error) return <p className="text-sm text-destructive">{error}</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">組織一覧</h1>
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">ID</TableHead>
              <TableHead>組織名</TableHead>
              <TableHead>コード</TableHead>
              <TableHead className="w-28">親組織 ID</TableHead>
              <TableHead className="w-20">表示順</TableHead>
              <TableHead className="w-20">状態</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orgs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  データなし
                </TableCell>
              </TableRow>
            ) : (
              orgs.map((o) => (
                <TableRow key={o.id}>
                  <TableCell>{o.id}</TableCell>
                  <TableCell>
                    <Link href="/org-chart" className="text-primary hover:underline">
                      {o.organizationName}
                    </Link>
                  </TableCell>
                  <TableCell>{o.organizationCode ?? '—'}</TableCell>
                  <TableCell>{o.parentOrganizationId ?? '—'}</TableCell>
                  <TableCell>{o.displayOrder}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={o.isActive
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-gray-100 text-gray-500 border-gray-200'}
                    >
                      {o.isActive ? '有効' : '無効'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
