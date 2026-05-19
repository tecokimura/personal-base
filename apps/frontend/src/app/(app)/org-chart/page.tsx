'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { api, type OrgChartNode, type OrgChartMembers, type EmployeeCard } from '@/lib/api';

const LEVEL_COLORS = ['#2563eb', '#0891b2', '#0284c7', '#6366f1', '#7c3aed'];

function levelColor(depth: number): string {
  return LEVEL_COLORS[depth % LEVEL_COLORS.length];
}

function MemberRow({ member }: { member: EmployeeCard }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', padding: '3px 0', fontSize: 12, flexWrap: 'wrap' }}>
      <Link href={`/employees/${member.employeeId}`} style={{ fontWeight: 500, color: '#2563eb', textDecoration: 'none' }}
        onMouseOver={(e) => { (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'underline'; }}
        onMouseOut={(e) => { (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'none'; }}
      >{member.displayName}</Link>
      {member.positionName && (
        <span style={{ color: '#64748b', fontSize: 11 }}>{member.positionName}</span>
      )}
      {member.supervisorDisplayName && (
        <span style={{ color: '#94a3b8', fontSize: 11 }}>上長: {member.supervisorDisplayName}</span>
      )}
      {member.primaryOrganizationName && (
        <span style={{ color: '#94a3b8', fontSize: 11 }}>主所属: {member.primaryOrganizationName}</span>
      )}
    </div>
  );
}

function MemberList({ members }: { members: OrgChartMembers }) {
  const total = members.primaryMembers.length + members.concurrentMembers.length;
  if (total === 0) {
    return <p style={{ fontSize: 12, color: '#aaa', margin: '4px 0 0' }}>所属メンバーなし</p>;
  }
  return (
    <div style={{
      background: '#f8fafc',
      border: '1px solid #e2e8f0',
      borderRadius: 6,
      padding: '8px 12px',
      marginTop: 4,
    }}>
      {members.primaryMembers.length > 0 && (
        <>
          <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 4px', fontWeight: 600 }}>主所属</p>
          {members.primaryMembers.map((m) => (
            <MemberRow key={m.employeeId} member={m} />
          ))}
        </>
      )}
      {members.concurrentMembers.length > 0 && (
        <>
          <p style={{ fontSize: 11, color: '#64748b', margin: `${members.primaryMembers.length > 0 ? 8 : 0}px 0 4px`, fontWeight: 600 }}>兼務</p>
          {members.concurrentMembers.map((m) => (
            <MemberRow key={m.employeeId} member={m} />
          ))}
        </>
      )}
    </div>
  );
}

function OrgNode({ node, depth = 0, isLast = false }: { node: OrgChartNode; depth?: number; isLast?: boolean }) {
  const [open, setOpen] = useState(depth < 2);
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

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 0',
        position: 'relative',
        flexWrap: 'wrap',
      }}>
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

        {/* 展開ボタン or スペーサー */}
        {hasChildren ? (
          <button
            onClick={() => setOpen((v) => !v)}
            style={{
              background: color,
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              color: '#fff',
              fontSize: 10,
              width: 18,
              height: 18,
              borderRadius: 3,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {open ? '▾' : '▸'}
          </button>
        ) : (
          <span style={{ width: 18, height: 18, flexShrink: 0, display: 'inline-block' }} />
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
          <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>
            {node.organizationCode}
          </span>
        )}

        <span style={{ fontSize: 11, color: '#94a3b8' }}>
          {node.memberCount} 名
        </span>

        {node.primaryLeader && (
          <span style={{
            fontSize: 11,
            color: '#0070f3',
            background: '#eff6ff',
            borderRadius: 4,
            padding: '1px 6px',
          }}>
            部門長: {node.primaryLeader.displayName}
          </span>
        )}

        {node.memberCount > 0 && (
          <button
            onClick={toggleMembers}
            style={{
              fontSize: 11,
              border: '1px solid #cbd5e1',
              background: membersOpen ? '#f1f5f9' : 'transparent',
              borderRadius: 4,
              padding: '1px 7px',
              cursor: 'pointer',
              color: '#64748b',
            }}
          >
            {membersOpen ? 'メンバーを閉じる' : 'メンバーを表示'}
          </button>
        )}
      </div>

      {/* メンバー一覧 */}
      {membersOpen && (
        <div style={{ marginLeft: 24, marginBottom: 6 }}>
          {membersLoading ? (
            <p style={{ fontSize: 12, color: '#aaa', margin: '4px 0 0' }}>読み込み中...</p>
          ) : members ? (
            <MemberList members={members} />
          ) : null}
        </div>
      )}

      {open && hasChildren && (
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
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    api.orgChart
      .tree()
      .then(setTree)
      .catch((err: unknown) => setError(String(err)))
      .finally(() => setLoading(false));
  }, [authLoading]);

  if (authLoading || loading) return <p>読み込み中...</p>;
  if (error) return <p className="error-msg">{error}</p>;

  return (
    <>
      <h1 className="page-title">組織図</h1>
      <div className="card org-tree">
        {tree.length === 0 ? (
          <p style={{ color: '#aaa', margin: 0 }}>組織データなし</p>
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
      </div>
    </>
  );
}
