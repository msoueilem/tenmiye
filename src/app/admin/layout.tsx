'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { tokenStore, decodeJwt, apiFetch, UnauthorizedError } from '@/lib/api';
import { AdminSession, DashboardProvider } from '@/context/DashboardContext';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { MemberAuthProvider } from '@/context/MemberAuthContext';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const isPublicAdminRoute =
    pathname === '/admin/signin' || pathname === '/admin/auth-callback';

  useEffect(() => {
    if (isPublicAdminRoute) {
      setLoading(false);
      return;
    }

    const token = tokenStore.getAccess('admin');
    if (!token) {
      router.replace('/admin/signin');
      return;
    }

    try {
      const payload = decodeJwt<{ userId: string; permissions: string[]; googleEmail?: string }>(token);
      setSession({
        userId: payload.userId,
        permissions: payload.permissions ?? [],
        googleEmail: payload.googleEmail ?? null,
      });
    } catch {
      tokenStore.clear('admin');
      router.replace('/admin/signin');
    } finally {
      setLoading(false);
    }
  }, [router, isPublicAdminRoute]);

  const logout = async () => {
    const refreshToken = tokenStore.getRefresh('admin');
    if (refreshToken) {
      await apiFetch('POST', '/auth/logout', { body: { refreshToken } }).catch(() => {});
    }
    tokenStore.clear('admin');
    router.replace('/admin/signin');
  };

  if (isPublicAdminRoute) return <>{children}</>;

  if (loading) {
    return (
      <div className="min-h-screen bg-dashboard-bg-light dark:bg-[#102210] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#d4af37] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <MemberAuthProvider>
      <DashboardProvider session={session} logout={logout}>
        <div
          className="flex h-screen overflow-hidden bg-[#f8fcf8] dark:bg-[#102210] text-slate-900 dark:text-slate-100"
          dir="rtl"
        >
          <DashboardSidebar />
          <main className="flex-1 flex flex-col h-full overflow-hidden relative">
            {children}
          </main>
        </div>
      </DashboardProvider>
    </MemberAuthProvider>
  );
}
