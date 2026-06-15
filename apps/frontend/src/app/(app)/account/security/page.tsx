'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function SecuritySettingsPage() {
  const [twoFactorStatus, setTwoFactorStatus] = useState<{ enabled: boolean; enabledAt: string | null } | null>(null);

  useEffect(() => {
    api.auth.twoFactor.status().then(setTwoFactorStatus).catch(() => {});
  }, []);

  return (
    <div>
      <h1 className="page-title">セキュリティ設定</h1>

      <div className="card" style={{ borderLeft: '3px solid #6b7280' }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 16px', color: '#374151' }}>
          二段階認証（2FA）
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            {twoFactorStatus === null ? (
              <p style={{ fontSize: 13, color: '#aaa', margin: 0 }}>読み込み中...</p>
            ) : twoFactorStatus.enabled ? (
              <>
                <p style={{ fontSize: 13, color: '#16a34a', fontWeight: 500, margin: '0 0 4px' }}>設定済み</p>
                {twoFactorStatus.enabledAt && (
                  <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>
                    {new Date(twoFactorStatus.enabledAt).toLocaleString('ja-JP')} に設定
                  </p>
                )}
              </>
            ) : (
              <>
                <p style={{ fontSize: 13, color: '#6b7280', fontWeight: 500, margin: '0 0 4px' }}>未設定</p>
                <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>
                  認証アプリを使った二段階認証を設定できます
                </p>
              </>
            )}
          </div>
          <Link href="/2fa/setup" className="btn-secondary" style={{ fontSize: 12 }}>
            {twoFactorStatus?.enabled ? '再設定する →' : '設定する →'}
          </Link>
        </div>
      </div>
    </div>
  );
}
