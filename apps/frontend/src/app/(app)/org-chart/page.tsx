'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api, type OrgChartNode } from '@/lib/api';

const LEVEL_COLORS = ['#2563eb', '#0891b2', '#0284c7', '#6366f1', '#7c3aed'];

function levelColor(depth: number): string {
  return LEVEL_COLORS[depth % LEVEL_COLORS.length];
}

function OrgNode({ node, depth = 0, isLast = false }: { node: OrgChartNode; depth?: number; isLast?: boolean }) {
  const [open, setOpen] = useState(depth < 2);
  const hasChildren = node.children.length > 0;
  const color = levelColor(depth);

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
      </div>

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
