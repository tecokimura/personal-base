'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';

const ROLES = [
  { roleType: 4, label: 'EXECUTIVE_VIEWER', description: '役員閲覧者（全テナント閲覧）' },
  { roleType: 3, label: 'ORG_ADMIN', description: '組織管理者（組織単位）' },
  { roleType: 1, label: 'HR_ADMIN', description: 'HR管理者（テナント全権限）' },
  { roleType: 2, label: 'MANAGER', description: 'マネージャー（組織ツリー）' },
  { roleType: 5, label: 'EMPLOYEE', description: '一般社員（本人のみ）' },
];

export default function DebugLoginPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState<number | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.debug
      .status()
      .then((data) => {
        if (!data.enabled) {
          router.replace('/login');
        } else {
          setEnabled(true);
          setChecking(false);
        }
      })
      .catch(() => {
        router.replace('/login');
      });
  }, [router]);

  async function handleLogin(roleType: number) {
    setError('');
    setSeedMessage('');
    setLoading(roleType);
    try {
      await api.debug.login(roleType);
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'ログインに失敗しました');
      setLoading(null);
    }
  }

  async function handleSeed() {
    setError('');
    setSeedMessage('');
    setSeeding(true);
    try {
      const result = await api.debug.seed();
      setSeedMessage(
        `セットアップ完了: ロールユーザー ${result.roleUsers.length}名、追加社員 ${result.extraEmployees.length}名を登録しました`,
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'セットアップに失敗しました');
    } finally {
      setSeeding(false);
    }
  }

  if (checking || !enabled) return null;

  const isAnyLoading = loading !== null || seeding;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#1a0000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{
          background: '#fff',
          border: '4px solid #dc2626',
          borderRadius: '8px',
          padding: '32px',
          maxWidth: '480px',
          width: '100%',
        }}
      >
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fca5a5',
            borderRadius: '4px',
            padding: '12px 16px',
            marginBottom: '24px',
          }}
        >
          <p style={{ color: '#991b1b', fontWeight: 700, margin: 0, fontSize: '14px' }}>
            ⚠ デバッグ機能 — 本番環境では使用不可
          </p>
          <p style={{ color: '#7f1d1d', fontSize: '12px', margin: '4px 0 0' }}>
            開発・テスト専用です。権限別ワンボタンログインができます。
          </p>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <button
            onClick={() => { void handleSeed(); }}
            disabled={isAnyLoading}
            style={{
              width: '100%',
              padding: '10px 16px',
              border: '1px solid #6b7280',
              borderRadius: '4px',
              background: seeding ? '#f3f4f6' : '#f9fafb',
              cursor: isAnyLoading ? 'not-allowed' : 'pointer',
              opacity: isAnyLoading && !seeding ? 0.5 : 1,
              fontSize: '13px',
              color: '#374151',
            }}
          >
            {seeding ? 'セットアップ中...' : '全フィクスチャをセットアップ（各権限ロール + 追加社員）'}
          </button>
          {seedMessage && (
            <p style={{ color: '#16a34a', fontSize: '12px', marginTop: '6px' }}>{seedMessage}</p>
          )}
        </div>

        <h1 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 20px' }}>
          デバッグログイン
        </h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {ROLES.map((role) => (
            <button
              key={role.roleType}
              onClick={() => {
                void handleLogin(role.roleType);
              }}
              disabled={isAnyLoading}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                background: loading === role.roleType ? '#f3f4f6' : '#fff',
                cursor: isAnyLoading ? 'not-allowed' : 'pointer',
                opacity: isAnyLoading && loading !== role.roleType ? 0.5 : 1,
                width: '100%',
                textAlign: 'left',
              }}
            >
              <span style={{ fontWeight: 600, fontSize: '14px' }}>{role.label}</span>
              <span style={{ color: '#6b7280', fontSize: '12px' }}>
                {loading === role.roleType ? 'ログイン中...' : role.description}
              </span>
            </button>
          ))}
        </div>

        {error && (
          <p style={{ color: '#dc2626', fontSize: '13px', marginTop: '12px' }}>{error}</p>
        )}
      </div>
    </div>
  );
}
