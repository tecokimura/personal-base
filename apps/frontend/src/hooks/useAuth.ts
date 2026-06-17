'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api, ApiError, type MeResponse } from '@/lib/api';

const TWO_FACTOR_PENDING_ALLOWED = ['/2fa/setup', '/2fa/verify', '/login', '/debug'];

export function useAuth() {
  const router = useRouter();
  const pathname = usePathname();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('session_hint') !== '1' : true,
  );

  useEffect(() => {
    api.auth
      .me()
      .then((data) => {
        setMe(data);
        if (typeof window !== 'undefined') {
          localStorage.setItem('session_hint', '1');
        }
        if (data.twoFactorPending && !TWO_FACTOR_PENDING_ALLOWED.some((p) => pathname?.startsWith(p))) {
          if (data.twoFactorSetupRequired) {
            router.replace('/2fa/setup');
          } else {
            router.replace('/2fa/verify');
          }
        }
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('session_hint');
          }
          router.replace('/login');
        }
      })
      .finally(() => setLoading(false));
  }, [router, pathname]);

  return { me, loading };
}
