'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMemberAuth } from '@/context/MemberAuthContext';

export default function DashboardHome() {
  const { user, loading } = useMemberAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/dashboard/login');
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div dir="rtl" className="flex min-h-screen items-center justify-center bg-[#071a07]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#0df20d] border-t-transparent" />
      </div>
    );
  }

  return (
    <div dir="rtl" className="flex min-h-screen items-center justify-center bg-[#071a07]">
      <p className="text-white text-xl">مرحباً — بوابة الأعضاء قيد الإنشاء (#31)</p>
    </div>
  );
}
