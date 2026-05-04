'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError, type MeResponse } from '@/lib/api';

export function useAuth() {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.auth
      .me()
      .then(setMe)
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace('/login');
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  return { me, loading };
}
