'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api, type OrgChartNode } from '@/lib/api';

function OrgNode({ node, depth = 0 }: { node: OrgChartNode; depth?: number }) {
  const [open, setOpen] = useState(depth < 2);

  return (
    <li style={{ paddingLeft: depth === 0 ? 0 : 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
        {node.children.length > 0 && (
          <button
            onClick={() => setOpen((v) => !v)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', color: '#888', fontSize: 12 }}
          >
            {open ? '▾' : '▸'}
          </button>
        )}
        {node.children.length === 0 && <span style={{ width: 20 }} />}
        <span className="org-node-name">{node.organizationName}</span>
        {node.organizationCode && (
          <span className="org-node-meta">[{node.organizationCode}]</span>
        )}
        <span className="org-node-meta">
          メンバー {node.memberCount} 名
        </span>
        {node.primaryLeader && (
          <span className="org-node-meta" style={{ color: '#0070f3' }}>
            部門長: {node.primaryLeader.displayName}
          </span>
        )}
      </div>
      {open && node.children.length > 0 && (
        <ul style={{ listStyle: 'none', paddingLeft: 24, margin: 0 }}>
          {node.children.map((child) => (
            <OrgNode key={child.organizationId} node={child} depth={depth + 1} />
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
            {tree.map((node) => (
              <OrgNode key={node.organizationId} node={node} />
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
