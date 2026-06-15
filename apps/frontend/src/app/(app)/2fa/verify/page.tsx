'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import Link from 'next/link';

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
    <div className="login-wrap">
      <div className="login-box">
        <h1>二段階認証</h1>
        <p style={{ fontSize: 14, color: '#555', marginBottom: 20 }}>
          {mode === 'totp'
            ? '認証アプリに表示されている6桁のコードを入力してください。'
            : 'バックアップコードを入力してください（例: ABCD-1234）。'}
        </p>
        <form onSubmit={(e) => { void handleSubmit(e); }}>
          <div className="form-group">
            <label htmlFor="code">
              {mode === 'totp' ? '認証コード' : 'バックアップコード'}
            </label>
            <input
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={mode === 'totp' ? '000000' : 'ABCD-1234'}
              autoComplete="one-time-code"
              required
            />
          </div>
          {error && <p className="error-msg">{error}</p>}
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? '認証中...' : '認証'}
          </button>
        </form>
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <button
            className="btn btn-secondary"
            style={{ fontSize: 13 }}
            onClick={() => {
              setMode(mode === 'totp' ? 'backup' : 'totp');
              setCode('');
              setError('');
            }}
          >
            {mode === 'totp' ? 'バックアップコードを使う' : '認証アプリを使う'}
          </button>
        </div>
        <div style={{ marginTop: 24, textAlign: 'center', borderTop: '1px solid #eee', paddingTop: 16 }}>
          <Link
            href="/login"
            onClick={() => { void api.auth.logout(); }}
            style={{ fontSize: 12, color: '#9ca3af', textDecoration: 'underline' }}
          >
            別のアカウントでログイン
          </Link>
        </div>
      </div>
    </div>
  );
}
