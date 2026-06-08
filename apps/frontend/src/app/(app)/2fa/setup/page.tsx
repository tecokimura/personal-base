'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { api, ApiError } from '@/lib/api';

type Step = 'qr' | 'confirm' | 'backup';

export default function TwoFactorSetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('qr');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);

  useEffect(() => {
    api.auth.twoFactor
      .initSetup()
      .then((data) => setQrCodeUrl(data.qrCodeUrl))
      .catch(() => setError('QRコードの生成に失敗しました'))
      .finally(() => setInitLoading(false));
  }, []);

  async function handleConfirm(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await api.auth.twoFactor.confirmSetup(code);
      setBackupCodes(result.backupCodes);
      setStep('backup');
    } catch (err) {
      setError(
        err instanceof ApiError ? 'コードが正しくありません' : '設定に失敗しました',
      );
    } finally {
      setLoading(false);
    }
  }

  if (step === 'backup') {
    return (
      <div className="login-wrap">
        <div className="login-box" style={{ maxWidth: 480 }}>
          <h1>バックアップコード</h1>
          <p style={{ fontSize: 14, color: '#555', marginBottom: 16 }}>
            以下のバックアップコードを安全な場所に保管してください。
            認証アプリが使えない場合にログインできます。各コードは一度のみ使用できます。
          </p>
          <div
            style={{
              background: '#f5f5f5',
              border: '1px solid #ddd',
              borderRadius: 6,
              padding: '12px 16px',
              marginBottom: 20,
              fontFamily: 'monospace',
              fontSize: 15,
              lineHeight: 2,
            }}
          >
            {backupCodes.map((c) => (
              <div key={c}>{c}</div>
            ))}
          </div>
          <button
            className="btn btn-primary"
            style={{ width: '100%' }}
            onClick={() => router.replace('/dashboard')}
          >
            ダッシュボードへ進む
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-wrap">
      <div className="login-box" style={{ maxWidth: 420 }}>
        <h1>二段階認証の設定</h1>

        {step === 'qr' && (
          <>
            <p style={{ fontSize: 14, color: '#555', marginBottom: 16 }}>
              Google Authenticator などの認証アプリでQRコードをスキャンしてください。
            </p>
            {initLoading ? (
              <p style={{ textAlign: 'center', color: '#aaa' }}>読み込み中...</p>
            ) : error ? (
              <p className="error-msg">{error}</p>
            ) : (
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <Image src={qrCodeUrl} alt="2FA QR Code" width={200} height={200} unoptimized />
              </div>
            )}
            <button
              className="btn btn-primary"
              style={{ width: '100%' }}
              onClick={() => { setStep('confirm'); setError(''); }}
              disabled={initLoading || !!error}
            >
              次へ（コードを入力）
            </button>
          </>
        )}

        {step === 'confirm' && (
          <form onSubmit={(e) => { void handleConfirm(e); }}>
            <p style={{ fontSize: 14, color: '#555', marginBottom: 16 }}>
              認証アプリに表示された6桁のコードを入力して設定を完了してください。
            </p>
            <div className="form-group">
              <label htmlFor="code">認証コード</label>
              <input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="000000"
                autoComplete="one-time-code"
                required
              />
            </div>
            {error && <p className="error-msg">{error}</p>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => { setStep('qr'); setError(''); }}
              >
                戻る
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ flex: 1 }}
              >
                {loading ? '確認中...' : '設定完了'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
