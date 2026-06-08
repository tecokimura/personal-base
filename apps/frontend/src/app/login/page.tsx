'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [tenantName, setTenantName] = useState('');
  const [tenantError, setTenantError] = useState('');
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.auth.getTenant()
      .then((t) => setTenantName(t.name))
      .catch(() => setTenantError('テナントが見つかりません。URLを確認してください。'));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await api.auth.login({ loginIdentifier, password });
      if (result.twoFactorPending) {
        if (result.twoFactorSetupRequired) {
          router.replace('/2fa/setup');
        } else {
          router.replace('/2fa/verify');
        }
      } else {
        router.replace('/dashboard');
      }
    } catch (err) {
      setError(err instanceof ApiError ? `ログイン失敗: ${err.message}` : 'ログインに失敗しました');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-box">
        <h1>PersonalBase ログイン</h1>
        {tenantError ? (
          <p className="error-msg">{tenantError}</p>
        ) : (
          tenantName && <p className="tenant-name">{tenantName}</p>
        )}
        <form onSubmit={(e) => { void handleSubmit(e); }}>
          <div className="form-group">
            <label htmlFor="loginIdentifier">ログイン ID</label>
            <input
              id="loginIdentifier"
              type="text"
              value={loginIdentifier}
              onChange={(e) => setLoginIdentifier(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">パスワード</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          {error && <p className="error-msg">{error}</p>}
          <button className="btn btn-primary" type="submit" disabled={loading || !!tenantError} style={{ width: '100%' }}>
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>
      </div>
    </div>
  );
}
