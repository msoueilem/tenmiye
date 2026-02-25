'use client';

import React from 'react';
import { signOut, User } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { useRouter } from 'next/navigation';

export function DashboardHome({ user }: { user: User }) {
  const router = useRouter();

  const handleLogout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      router.push('/signin');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <div className="bg-dashboard-bg-light dark:bg-dashboard-bg-dark font-dashboard flex min-h-screen flex-col items-center justify-center p-6 text-slate-900 dark:text-slate-100">
      <div className="dark:border-dashboard-primary/10 w-full max-w-2xl rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-xl md:p-10 dark:bg-[#1a2e1d]">
        <div className="mb-6">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName || 'User'}
              className="border-dashboard-primary/20 mx-auto h-24 w-24 rounded-full border-4 shadow-lg"
            />
          ) : (
            <div className="bg-dashboard-primary/10 text-dashboard-primary mx-auto flex h-24 w-24 items-center justify-center rounded-full">
              <span className="material-symbols-outlined text-5xl">person</span>
            </div>
          )}
        </div>

        <h1 className="mb-2 text-3xl font-black">
          مرحباً بك، {user.displayName || 'أيها المسؤول'}!
        </h1>
        <p className="mb-8 text-slate-500 dark:text-slate-400">{user.email}</p>

        <div className="mb-8 overflow-hidden rounded-xl bg-slate-50 p-6 text-left dark:bg-slate-900/50">
          <h3 className="text-dashboard-primary mb-4 flex items-center gap-2 text-sm font-bold">
            <span className="material-symbols-outlined text-base">code</span>
            بيانات المستخدم التقنية:
          </h3>
          <pre className="overflow-x-auto font-mono text-[10px] break-all whitespace-pre-wrap text-slate-600 md:text-xs dark:text-slate-400">
            {JSON.stringify(user.toJSON(), null, 2)}
          </pre>
        </div>

        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <button
            onClick={() => router.push('/')}
            className="h-12 rounded-lg bg-slate-100 px-8 font-bold text-slate-700 transition-all hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            العودة للموقع
          </button>
          <button
            onClick={handleLogout}
            className="flex h-12 items-center justify-center gap-2 rounded-lg bg-red-500 px-8 font-bold text-white shadow-lg shadow-red-500/20 transition-all hover:bg-red-600"
          >
            <span className="material-symbols-outlined">logout</span>
            تسجيل الخروج
          </button>
        </div>
      </div>
    </div>
  );
}
