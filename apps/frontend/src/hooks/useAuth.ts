'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api, ApiError, type MeResponse } from '@/lib/api';

const TWO_FACTOR_PATHS = ['/2fa/setup', '/2fa/verify'];

export function useAuth() {
  const router = useRouter();
  const pathname = usePathname();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.auth
      .me()
      .then((data) => {
        setMe(data);
        if (data.twoFactorPending && !TWO_FACTOR_PATHS.some((p) => pathname?.startsWith(p))) {
          if (data.twoFactorSetupRequired) {
            router.replace('/2fa/setup');
          } else {
            router.replace('/2fa/verify');
          }
        }
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace('/login');
        }
      })
      .finally(() => setLoading(false));
  }, [router, pathname]);

  return { me, loading };
}
