'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Eye, EyeOff } from 'lucide-react';

function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pr-10"
        autoComplete="off"
      />
      <button
        type="button"
        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        onClick={() => setShow((s) => !s)}
        tabIndex={-1}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export default function SecuritySettingsPage() {
  const [twoFactorStatus, setTwoFactorStatus] = useState<{ enabled: boolean; enabledAt: string | null } | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    api.auth.twoFactor.status().then(setTwoFactorStatus).catch(() => {});
  }, []);

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(false);

    if (newPassword !== confirmPassword) {
      setPwError('新しいパスワードと確認が一致しません');
      return;
    }

    setPwLoading(true);
    try {
      await api.auth.changePassword({ currentPassword, newPassword });
      setPwSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setPwError('現在のパスワードが正しくありません');
      } else if (err instanceof ApiError) {
        setPwError(err.message);
      } else {
        setPwError('エラーが発生しました');
      }
    } finally {
      setPwLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">セキュリティ設定</h1>

      <Card className="max-w-lg border-l-4 border-l-gray-400">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-700">パスワード変更</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="currentPassword" className="text-xs">現在のパスワード</Label>
              <PasswordInput
                id="currentPassword"
                value={currentPassword}
                onChange={setCurrentPassword}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="newPassword" className="text-xs">新しいパスワード</Label>
              <PasswordInput
                id="newPassword"
                value={newPassword}
                onChange={setNewPassword}
                placeholder="8文字以上、大文字・小文字・数字・記号を含む"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="confirmPassword" className="text-xs">新しいパスワード（確認）</Label>
              <PasswordInput
                id="confirmPassword"
                value={confirmPassword}
                onChange={setConfirmPassword}
              />
            </div>
            {pwError && <p className="text-xs text-red-500">{pwError}</p>}
            {pwSuccess && <p className="text-xs text-green-600">パスワードを変更しました</p>}
            <Button type="submit" size="sm" disabled={pwLoading}>
              {pwLoading ? '変更中...' : '変更する'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="max-w-lg border-l-4 border-l-gray-400">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-700">二段階認証（2FA）</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div>
              {twoFactorStatus === null ? (
                <p className="text-sm text-muted-foreground">読み込み中...</p>
              ) : twoFactorStatus.enabled ? (
                <>
                  <p className="text-sm font-medium text-green-600">設定済み</p>
                  {twoFactorStatus.enabledAt && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(twoFactorStatus.enabledAt).toLocaleString('ja-JP')} に設定
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-muted-foreground">未設定</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    認証アプリを使った二段階認証を設定できます
                  </p>
                </>
              )}
            </div>
            <Link href="/2fa/setup" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
              {twoFactorStatus?.enabled ? '再設定する →' : '設定する →'}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
