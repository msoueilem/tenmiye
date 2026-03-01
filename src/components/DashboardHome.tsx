'use client';

import React from 'react';
import { User } from 'firebase/auth';
import { Admin } from '@/types/users';
import Link from 'next/link';

export function DashboardHome({ user, admin }: { user: User; admin: Admin }) {
  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">لوحة التحكم</h1>
          <p className="text-slate-500 dark:text-slate-400">مرحباً بك مجدداً، {user.displayName || 'أيها المسؤول'}. إليك نظرة عامة على النظام.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-[#1a331a] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                <span className="material-symbols-outlined">group</span>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">إجمالي الأعضاء</p>
                <p className="text-2xl font-bold">250</p>
              </div>
            </div>
            <Link href="/dashboard/members" className="text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline">عرض الكل</Link>
          </div>

          <div className="bg-white dark:bg-[#1a331a] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-[#0b3d0b]/10 text-[#0b3d0b] dark:text-[#d4af37] rounded-lg">
                <span className="material-symbols-outlined">how_to_vote</span>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">الانتخابات النشطة</p>
                <p className="text-2xl font-bold">1</p>
              </div>
            </div>
            <Link href="/dashboard/elections" className="text-sm text-[#0b3d0b] dark:text-[#d4af37] font-medium hover:underline">عرض التفاصيل</Link>
          </div>

          <div className="bg-white dark:bg-[#1a331a] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
                <span className="material-symbols-outlined">volunteer_activism</span>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">المبادرات</p>
                <p className="text-2xl font-bold">8</p>
              </div>
            </div>
            <Link href="/dashboard/settings" className="text-sm text-purple-600 dark:text-purple-400 font-medium hover:underline">إدارة المبادرات</Link>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1a331a] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-lg font-bold">بيانات حسابك</h2>
          </div>
          <div className="p-6">
             <div className="flex items-center gap-6">
                {user.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt={user.displayName || 'User'} 
                    className="h-20 w-20 rounded-full border-4 border-[#0b3d0b]/10"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#0b3d0b]/10 text-[#0b3d0b]">
                    <span className="material-symbols-outlined text-4xl">person</span>
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-bold">{user.displayName || 'أيها المسؤول'}</h3>
                  <p className="text-slate-500 dark:text-slate-400">{user.email}</p>
                  <span className="inline-block mt-2 rounded-full bg-[#0b3d0b]/10 px-3 py-1 text-xs font-bold text-[#0b3d0b] dark:text-[#d4af37]">
                    {admin.role === 'super-admin' ? 'مدير عام' : 'محرر'}
                  </span>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
