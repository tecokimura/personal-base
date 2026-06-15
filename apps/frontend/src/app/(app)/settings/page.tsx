'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api, ApiError } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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

  if (authLoading) return <p className="text-sm text-muted-foreground">読み込み中...</p>;
  if (!isHrAdmin) return <p className="text-sm text-destructive">この画面は HR_ADMIN のみアクセスできます。</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">テナント設定</h1>
      <Card className="max-w-lg">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">二段階認証（2FA）ポリシー</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadError ? (
            <p className="text-sm text-destructive">{loadError}</p>
          ) : policy === null ? (
            <p className="text-sm text-muted-foreground">読み込み中...</p>
          ) : (
            <>
              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="twoFactorPolicy"
                    value="1"
                    checked={policy === 1}
                    onChange={() => setPolicy(1)}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="text-sm font-medium">任意</div>
                    <div className="text-xs text-muted-foreground">ユーザーが自由に2FAを設定できます</div>
                  </div>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="twoFactorPolicy"
                    value="2"
                    checked={policy === 2}
                    onChange={() => setPolicy(2)}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="text-sm font-medium">必須</div>
                    <div className="text-xs text-muted-foreground">
                      全ユーザーにログイン時の2FA認証を強制します。未設定ユーザーはログイン後にセットアップが必要です。
                    </div>
                  </div>
                </label>
              </div>
              {saveError && <p className="text-sm text-destructive">{saveError}</p>}
              {saved && <p className="text-sm text-green-600">保存しました</p>}
              <Button onClick={() => { void handleSave(); }} disabled={saving}>
                {saving ? '保存中...' : '保存'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
