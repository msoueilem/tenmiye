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
    <div className="min-h-screen bg-dashboard-bg-light dark:bg-dashboard-bg-dark text-slate-900 dark:text-slate-100 font-dashboard flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-white dark:bg-[#1a2e1d] rounded-2xl shadow-xl border border-slate-100 dark:border-dashboard-primary/10 p-8 md:p-10 text-center">
        <div className="mb-6">
          {user.photoURL ? (
            <img 
              src={user.photoURL} 
              alt={user.displayName || 'User'} 
              className="w-24 h-24 rounded-full mx-auto border-4 border-dashboard-primary/20 shadow-lg"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-dashboard-primary/10 flex items-center justify-center mx-auto text-dashboard-primary">
              <span className="material-symbols-outlined text-5xl">person</span>
            </div>
          )}
        </div>

        <h1 className="text-3xl font-black mb-2">مرحباً بك، {user.displayName || 'أيها المسؤول'}!</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-8">{user.email}</p>

        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-6 text-left mb-8 overflow-hidden">
          <h3 className="text-sm font-bold text-dashboard-primary mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-base">code</span>
            بيانات المستخدم التقنية:
          </h3>
          <pre className="text-[10px] md:text-xs font-mono text-slate-600 dark:text-slate-400 overflow-x-auto whitespace-pre-wrap break-all">
            {JSON.stringify(user.toJSON(), null, 2)}
          </pre>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button 
            onClick={() => router.push('/')}
            className="px-8 h-12 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-lg transition-all"
          >
            العودة للموقع
          </button>
          <button 
            onClick={handleLogout}
            className="px-8 h-12 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">logout</span>
            تسجيل الخروج
          </button>
        </div>
      </div>
    </div>
  );
}
