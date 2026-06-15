'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

type Step = 'qr' | 'confirm' | 'backup';

export default function TwoFactorSetupPage() {
  const router = useRouter();
  const { me } = useAuth();
  const isRequired = me?.twoFactorSetupRequired === true;
  const [step, setStep] = useState<Step>('qr');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  function copySecret() {
    const doCopy = (text: string) => {
      if (navigator.clipboard) {
        void navigator.clipboard.writeText(text);
      } else {
        const el = document.createElement('textarea');
        el.value = text;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
    };
    doCopy(secretKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  useEffect(() => {
    api.auth.twoFactor
      .initSetup()
      .then((data) => { setQrCodeUrl(data.qrCodeUrl); setSecretKey(data.secret); })
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

  function downloadBackupCodes() {
    const text = backupCodes.join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleGoToDashboard() {
    const ok = window.confirm(
      'バックアップコードを保存しましたか？\n\nこの画面を閉じると二度と表示されません。',
    );
    if (ok) router.replace('/dashboard');
  }

  if (step === 'backup') {
    return (
      <div className="login-wrap">
        <div className="login-box" style={{ maxWidth: 480 }}>
          <h1>バックアップコード</h1>

          {/* Step 1: 確認 */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 8, letterSpacing: '0.05em' }}>
              STEP 1 — コードを確認する
            </p>
            <p style={{ fontSize: 13, color: '#555', marginBottom: 10 }}>
              認証アプリが使えない場合にこのコードでログインできます。各コードは一度のみ使用できます。
            </p>
            <div
              style={{
                background: '#f5f5f5',
                border: '1px solid #ddd',
                borderRadius: 6,
                padding: '12px 16px',
                fontFamily: 'monospace',
                fontSize: 15,
                lineHeight: 2,
              }}
            >
              {backupCodes.map((c) => (
                <div key={c}>{c}</div>
              ))}
            </div>
          </div>

          {/* Step 2: 保存 */}
          <div style={{ marginBottom: 24 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 8, letterSpacing: '0.05em' }}>
              STEP 2 — 安全な場所に保存する
            </p>
            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%' }}
              onClick={downloadBackupCodes}
            >
              テキストファイルでダウンロード
            </button>
          </div>

          {/* Step 3: 完了 */}
          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 20 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 8, letterSpacing: '0.05em' }}>
              STEP 3 — 保存が完了したら進む
            </p>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ width: '100%' }}
              onClick={handleGoToDashboard}
            >
              ダッシュボードへ進む
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-wrap">
      <div className="login-box" style={{ maxWidth: 420 }}>
        {isRequired && (
          <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: 6, padding: '10px 14px', marginBottom: 20, fontSize: 13, color: '#854d0e' }}>
            このアカウントでは二段階認証の設定が必須です。下記の手順で設定を完了してください。
          </div>
        )}
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
              <>
                <div style={{ textAlign: 'center', marginBottom: 12 }}>
                  <Image src={qrCodeUrl} alt="2FA QR Code" width={200} height={200} unoptimized />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <button
                    type="button"
                    onClick={() => setShowSecret((v) => !v)}
                    style={{ fontSize: 12, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                  >
                    {showSecret ? '手動入力欄を閉じる' : 'QRコードが読めない場合はこちら'}
                  </button>
                  {showSecret && (
                    <div style={{ marginTop: 8, background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 4, padding: '8px 12px' }}>
                      <p style={{ fontSize: 11, color: '#888', margin: '0 0 4px' }}>認証アプリに手動で入力してください</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <code style={{ fontSize: 14, letterSpacing: 2, wordBreak: 'break-all', flex: 1 }}>{secretKey}</code>
                        <button
                          type="button"
                          onClick={copySecret}
                          style={{ fontSize: 11, flexShrink: 0, padding: '4px 8px', border: '1px solid #ccc', borderRadius: 4, background: copied ? '#f0fdf4' : '#fff', cursor: 'pointer', color: copied ? '#16a34a' : undefined }}
                        >
                          {copied ? 'コピーしました' : 'コピー'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
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
