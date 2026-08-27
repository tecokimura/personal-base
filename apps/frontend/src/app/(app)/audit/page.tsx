'use client';

import { useMemo, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api, type AuditEvent, type EmployeeListItem, ApiError } from '@/lib/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

const PAGE_SIZE_OPTIONS = [50, 100, 200] as const;
const EVENT_TYPE_OPTIONS = ['ALL', 'LOGIN', 'EDIT'] as const;
type EventTypeFilter = (typeof EVENT_TYPE_OPTIONS)[number];

function nameCell(id: number | null, nameMap: Map<number, string>): React.ReactNode {
  if (id == null) return '—';
  const name = nameMap.get(id);
  if (name) {
    return (
      <>
        {name}{' '}
        <span className="text-xs text-muted-foreground">(ID: {id})</span>
      </>
    );
  }
  return <span className="text-muted-foreground">ID: {id}</span>;
}

export default function AuditPage() {
  const { me, loading: authLoading } = useAuth();
  const [events, setEvents] = useState<AuditEvent[] | null>(null);
  const [nameMap, setNameMap] = useState<Map<number, string>>(new Map());
  const [error, setError] = useState('');
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(50);
  const [page, setPage] = useState(0);
  const [eventTypeFilter, setEventTypeFilter] = useState<EventTypeFilter>('ALL');

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

  const filteredEvents = useMemo(
    () => events?.filter((ev) => eventTypeFilter === 'ALL' || ev.eventType === eventTypeFilter) ?? null,
    [events, eventTypeFilter],
  );
  const totalPages = filteredEvents ? Math.ceil(filteredEvents.length / pageSize) : 0;
  const pagedEvents = useMemo(
    () => filteredEvents?.slice(page * pageSize, (page + 1) * pageSize) ?? [],
    [filteredEvents, page, pageSize],
  );

  function handlePageSizeChange(newSize: (typeof PAGE_SIZE_OPTIONS)[number]) {
    setPageSize(newSize);
    setPage(0);
  }

  function handleEventTypeFilterChange(value: EventTypeFilter) {
    setEventTypeFilter(value);
    setPage(0);
  }

  if (authLoading) return <p className="text-sm text-muted-foreground">読み込み中...</p>;
  if (!isHrAdmin) return <p className="text-sm text-destructive">この画面は HR_ADMIN のみ利用できます</p>;
  if (error) return <p className="text-sm text-destructive">{error}</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">監査ログ</h1>
      <Card>
        <CardContent className="pt-4">
          {filteredEvents === null ? (
            <p className="text-sm text-muted-foreground">読み込み中...</p>
          ) : filteredEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">監査イベントはありません</p>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">全 {filteredEvents.length} 件</span>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    種別:
                    <select
                      value={eventTypeFilter}
                      onChange={(e) => handleEventTypeFilterChange(e.target.value as EventTypeFilter)}
                      className="rounded border border-input bg-background px-2 py-1 text-xs"
                    >
                      <option value="ALL">すべて</option>
                      <option value="LOGIN">ログイン</option>
                      <option value="EDIT">編集</option>
                    </select>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    表示件数:
                    <select
                      value={pageSize}
                      onChange={(e) => handlePageSizeChange(Number(e.target.value) as (typeof PAGE_SIZE_OPTIONS)[number])}
                      className="rounded border border-input bg-background px-2 py-1 text-xs"
                    >
                      {PAGE_SIZE_OPTIONS.map((n) => (
                        <option key={n} value={n}>{n} 件</option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">発生日時</TableHead>
                      <TableHead className="w-24">種別</TableHead>
                      <TableHead>実行者</TableHead>
                      <TableHead>対象者</TableHead>
                      <TableHead>対象種別</TableHead>
                      <TableHead>操作種別</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedEvents.map((ev, i) => (
                      <TableRow key={i}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {new Date(ev.occurredAt).toLocaleString('ja-JP')}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={ev.eventType === 'LOGIN'
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : 'bg-gray-100 text-gray-500 border-gray-200'}
                          >
                            {ev.eventType}
                          </Badge>
                        </TableCell>
                        <TableCell>{nameCell(ev.actorEmployeeId, nameMap)}</TableCell>
                        <TableCell>{nameCell(ev.targetEmployeeId, nameMap)}</TableCell>
                        <TableCell>{ev.targetType ?? '—'}</TableCell>
                        <TableCell>{ev.operationType}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPage((p) => p - 1)}
                    disabled={page === 0}
                  >
                    前へ
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {page + 1} / {totalPages} ページ
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= totalPages - 1}
                  >
                    次へ
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
