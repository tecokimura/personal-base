'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function SecuritySettingsPage() {
  const [twoFactorStatus, setTwoFactorStatus] = useState<{ enabled: boolean; enabledAt: string | null } | null>(null);

  useEffect(() => {
    api.auth.twoFactor.status().then(setTwoFactorStatus).catch(() => {});
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">セキュリティ設定</h1>

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
