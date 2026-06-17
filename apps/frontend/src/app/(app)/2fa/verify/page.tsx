'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default function TwoFactorVerifyPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [mode, setMode] = useState<'totp' | 'backup'>('totp');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'totp') {
        await api.auth.twoFactor.verify(code);
      } else {
        await api.auth.twoFactor.backupVerify(code);
      }
      router.replace('/dashboard');
    } catch (err) {
      setError(
        err instanceof ApiError
          ? mode === 'totp'
            ? 'コードが正しくありません'
            : 'コードが認識されませんでした。別のバックアップコードをお試しください'
          : '認証に失敗しました',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl text-center">二段階認証</CardTitle>
          <p className="text-sm text-muted-foreground text-center">
            {mode === 'totp'
              ? '認証アプリに表示されている6桁のコードを入力してください。'
              : 'バックアップコードを入力してください（例: ABCD-1234）。'}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="code">
                {mode === 'totp' ? '認証コード' : 'バックアップコード'}
              </Label>
              <Input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={mode === 'totp' ? '000000' : 'ABCD-1234'}
                autoComplete="one-time-code"
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '認証中...' : '認証'}
            </Button>
          </form>

          <div className="text-center">
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => {
                setMode(mode === 'totp' ? 'backup' : 'totp');
                setCode('');
                setError('');
              }}
            >
              {mode === 'totp' ? 'バックアップコードを使う' : '認証アプリを使う'}
            </Button>
          </div>

          <div className="text-center border-t pt-4">
            <Link
              href="/login"
              onClick={() => {
                localStorage.removeItem('session_hint');
                void api.auth.logout();
              }}
              className="text-xs text-muted-foreground underline hover:text-foreground"
            >
              別のアカウントでログイン
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
