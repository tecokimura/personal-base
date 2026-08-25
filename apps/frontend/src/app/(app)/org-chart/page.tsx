'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { api, ApiError, type OrgChartNode, type OrgChartMembers, type EmployeeCard } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const LEVEL_COLORS = ['#2563eb', '#0891b2', '#0284c7', '#6366f1', '#7c3aed'];

function levelColor(depth: number): string {
  return LEVEL_COLORS[depth % LEVEL_COLORS.length];
}

function MemberRow({ member }: { member: EmployeeCard }) {
  return (
    <div className="flex gap-2 items-baseline py-0.5 text-xs flex-wrap">
      <Link href={`/employees/${member.employeeId}`} className="font-medium text-blue-600 hover:underline">
        {member.displayName}
      </Link>
      {member.positionName && (
        <span className="text-muted-foreground">{member.positionName}</span>
      )}
      {member.supervisorDisplayName && (
        <span className="text-muted-foreground/60">上長: {member.supervisorDisplayName}</span>
      )}
    </div>
  );
}

function MemberList({ members }: { members: OrgChartMembers }) {
  if (members.primaryMembers.length === 0) {
    return <p className="text-xs text-muted-foreground mt-1">所属メンバーなし</p>;
  }
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-md px-3 py-2 mt-1">
      {members.primaryMembers.map((m) => (
        <MemberRow key={m.employeeId} member={m} />
      ))}
    </div>
  );
}

function OrgNode({ node, depth = 0, isLast = false }: { node: OrgChartNode; depth?: number; isLast?: boolean }) {
  const [membersOpen, setMembersOpen] = useState(false);
  const [members, setMembers] = useState<OrgChartMembers | null>(null);
  const [membersLoading, setMembersLoading] = useState(false);
  const hasChildren = node.children.length > 0;
  const color = levelColor(depth);

  function toggleMembers() {
    if (membersOpen) {
      setMembersOpen(false);
      return;
    }
    setMembersOpen(true);
    if (!members && !membersLoading) {
      setMembersLoading(true);
      api.orgChart
        .members(node.organizationId)
        .then(setMembers)
        .catch(() => {})
        .finally(() => setMembersLoading(false));
    }
  }

  return (
    <li style={{ position: 'relative', listStyle: 'none' }}>
      {/* 縦の接続線（最後の子以外） */}
      {depth > 0 && !isLast && (
        <span style={{
          position: 'absolute',
          left: -16,
          top: 0,
          bottom: 0,
          width: 1,
          background: '#e2e8f0',
        }} />
      )}

      <div className="flex items-center gap-1.5 py-1 relative flex-wrap">
        {/* 横の接続線 */}
        {depth > 0 && (
          <span style={{
            position: 'absolute',
            left: -16,
            top: '50%',
            width: 12,
            height: 1,
            background: '#e2e8f0',
          }} />
        )}

        {/* 組織名バッジ */}
        <span style={{
          fontWeight: 600,
          fontSize: 13,
          color,
          borderLeft: `3px solid ${color}`,
          paddingLeft: 6,
          lineHeight: '1.4',
        }}>
          {node.organizationName}
        </span>

        {node.organizationCode && (
          <span className="text-xs text-muted-foreground font-mono">{node.organizationCode}</span>
        )}

        <span className="text-xs text-muted-foreground">{node.memberCount} 名</span>

        {node.primaryLeader && (
          <span className="text-xs text-blue-600 bg-blue-50 rounded px-1.5 py-0.5">
            部門長: {node.primaryLeader.displayName}
          </span>
        )}

        {node.memberCount > 0 && (
          <button
            onClick={toggleMembers}
            className="text-xs border border-slate-300 rounded px-1.5 py-0.5 text-slate-500 hover:bg-slate-50 cursor-pointer"
            style={{ background: membersOpen ? '#f1f5f9' : 'transparent' }}
          >
            {membersOpen ? 'メンバーを閉じる' : 'メンバーを表示'}
          </button>
        )}
      </div>

      {/* メンバー一覧 */}
      {membersOpen && (
        <div className="ml-6 mb-1.5">
          {membersLoading ? (
            <p className="text-xs text-muted-foreground mt-1">読み込み中...</p>
          ) : members ? (
            <MemberList members={members} />
          ) : null}
        </div>
      )}

      {hasChildren && (
        <ul style={{ listStyle: 'none', paddingLeft: 32, margin: 0, position: 'relative' }}>
          {node.children.map((child, idx) => (
            <OrgNode
              key={child.organizationId}
              node={child}
              depth={depth + 1}
              isLast={idx === node.children.length - 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function OrgChartPage() {
  const { loading: authLoading } = useAuth();
  const [tree, setTree] = useState<OrgChartNode[]>([]);
  const [unassigned, setUnassigned] = useState<EmployeeCard[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    Promise.all([
      api.orgChart.tree(),
      api.orgChart.unassigned(),
    ])
      .then(([treeData, unassignedData]) => {
        setTree(treeData);
        setUnassigned(unassignedData);
      })
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : '読み込みに失敗しました'))
      .finally(() => setLoading(false));
  }, [authLoading]);

  if (authLoading || loading) return <p className="text-sm text-muted-foreground">読み込み中...</p>;
  if (error) return <p className="text-sm text-destructive">{error}</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">組織図</h1>

      <Card>
        <CardContent className="pt-4">
          {tree.length === 0 ? (
            <p className="text-sm text-muted-foreground">組織データなし</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {tree.map((node, idx) => (
                <OrgNode
                  key={node.organizationId}
                  node={node}
                  depth={0}
                  isLast={idx === tree.length - 1}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {unassigned.length > 0 && (
        <Card className="border-l-4 border-l-amber-400">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-amber-700">
              所属なし（{unassigned.length}名）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              {unassigned.map((m) => (
                <MemberRow key={m.employeeId} member={m} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
