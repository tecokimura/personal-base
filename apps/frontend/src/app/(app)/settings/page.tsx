'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api, ApiError } from '@/lib/api';

export default function SettingsPage() {
  const { me, loading: authLoading } = useAuth();
  const isHrAdmin = me?.roleTypes.includes(1) ?? false;

  const [policy, setPolicy] = useState<number | null>(null);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (authLoading || !isHrAdmin) return;
    api.twoFactorAdmin
      .getPolicy()
      .then((data) => setPolicy(data.twoFactorPolicy))
      .catch(() => setLoadError('設定の読み込みに失敗しました'));
  }, [authLoading, isHrAdmin]);

  async function handleSave() {
    if (policy === null) return;
    setSaveError('');
    setSaved(false);
    setSaving(true);
    try {
      await api.twoFactorAdmin.setPolicy(policy);
      setSaved(true);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  if (authLoading) return <div className="page-loading">読み込み中...</div>;
  if (!isHrAdmin) {
    return (
      <div className="page-container">
        <h1>テナント設定</h1>
        <p style={{ color: '#888' }}>この画面は HR_ADMIN のみアクセスできます。</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1>テナント設定</h1>
      <div className="card" style={{ maxWidth: 480 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 16px' }}>二段階認証（2FA）ポリシー</h2>
        {loadError ? (
          <p className="error-msg">{loadError}</p>
        ) : policy === null ? (
          <p style={{ color: '#aaa' }}>読み込み中...</p>
        ) : (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="twoFactorPolicy"
                  value="1"
                  checked={policy === 1}
                  onChange={() => setPolicy(1)}
                />
                <div>
                  <div style={{ fontWeight: 500 }}>任意</div>
                  <div style={{ fontSize: 12, color: '#666' }}>ユーザーが自由に2FAを設定できます</div>
                </div>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="twoFactorPolicy"
                  value="2"
                  checked={policy === 2}
                  onChange={() => setPolicy(2)}
                />
                <div>
                  <div style={{ fontWeight: 500 }}>必須</div>
                  <div style={{ fontSize: 12, color: '#666' }}>
                    全ユーザーにログイン時の2FA認証を強制します。
                    未設定ユーザーはログイン後にセットアップが必要です。
                  </div>
                </div>
              </label>
            </div>
            {saveError && <p className="error-msg" style={{ marginBottom: 8 }}>{saveError}</p>}
            {saved && <p style={{ color: '#16a34a', marginBottom: 8, fontSize: 13 }}>保存しました</p>}
            <button
              className="btn-primary"
              onClick={() => { void handleSave(); }}
              disabled={saving}
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
