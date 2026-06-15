'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">バックアップコード</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1 */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground tracking-wider">
                STEP 1 — コードを確認する
              </p>
              <p className="text-sm text-muted-foreground">
                認証アプリが使えない場合にこのコードでログインできます。各コードは一度のみ使用できます。
              </p>
              <div className="bg-muted rounded-md border p-4 font-mono text-sm leading-loose">
                {backupCodes.map((c) => (
                  <div key={c}>{c}</div>
                ))}
              </div>
            </div>

            {/* Step 2 */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground tracking-wider">
                STEP 2 — 安全な場所に保存する
              </p>
              <Button className="w-full" onClick={downloadBackupCodes}>
                テキストファイルでダウンロード
              </Button>
            </div>

            {/* Step 3 */}
            <div className="space-y-2 border-t pt-4">
              <p className="text-xs font-semibold text-muted-foreground tracking-wider">
                STEP 3 — 保存が完了したら進む
              </p>
              <Button variant="outline" className="w-full" onClick={handleGoToDashboard}>
                ダッシュボードへ進む
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="pb-4">
          {isRequired && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md px-4 py-3 mb-2 text-sm text-yellow-800">
              このアカウントでは二段階認証の設定が必須です。下記の手順で設定を完了してください。
            </div>
          )}
          <CardTitle className="text-xl">二段階認証の設定</CardTitle>
        </CardHeader>
        <CardContent>
          {step === 'qr' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Google Authenticator などの認証アプリでQRコードをスキャンしてください。
              </p>
              {initLoading ? (
                <p className="text-center text-muted-foreground text-sm">読み込み中...</p>
              ) : error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : (
                <>
                  <div className="flex justify-center">
                    <Image src={qrCodeUrl} alt="2FA QR Code" width={200} height={200} unoptimized />
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowSecret((v) => !v)}
                      className="text-xs text-muted-foreground underline hover:text-foreground"
                    >
                      {showSecret ? '手動入力欄を閉じる' : 'QRコードが読めない場合はこちら'}
                    </button>
                    {showSecret && (
                      <div className="mt-2 bg-muted border rounded-md p-3 space-y-2">
                        <p className="text-xs text-muted-foreground">認証アプリに手動で入力してください</p>
                        <div className="flex items-center gap-2">
                          <code className="text-sm tracking-widest break-all flex-1">{secretKey}</code>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={copySecret}
                            className={copied ? 'text-green-600 border-green-300' : ''}
                          >
                            {copied ? 'コピーしました' : 'コピー'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
              <Button
                className="w-full"
                onClick={() => { setStep('confirm'); setError(''); }}
                disabled={initLoading || !!error}
              >
                次へ（コードを入力）
              </Button>
            </div>
          )}

          {step === 'confirm' && (
            <form onSubmit={(e) => { void handleConfirm(e); }} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                認証アプリに表示された6桁のコードを入力して設定を完了してください。
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="code">認証コード</Label>
                <Input
                  id="code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="000000"
                  autoComplete="one-time-code"
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setStep('qr'); setError(''); }}
                >
                  戻る
                </Button>
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? '確認中...' : '設定完了'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
