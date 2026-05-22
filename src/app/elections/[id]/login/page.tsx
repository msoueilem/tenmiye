'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { tokenStore } from '@/lib/api';

export default function ElectionLoginPage() {
  const { id } = useParams();
  const router = useRouter();

  useEffect(() => {
    if (typeof id !== 'string') return;
    const token = tokenStore.getAccess('member');
    if (token) {
      router.replace(`/elections/${id}/vote`);
    } else {
      router.replace(`/member/signin?redirect=/elections/${id}/vote`);
    }
  }, [id, router]);

  return null;
}
