'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { useRouter } from 'next/navigation';

export function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push('/signin');
  };

  const navItems = [
    { name: 'لوحة التحكم', icon: 'dashboard', href: '/dashboard' },
    { name: 'الأعضاء', icon: 'group', href: '/dashboard/members' },
    { name: 'الانتخابات', icon: 'how_to_vote', href: '/dashboard/elections' },
    { name: 'إعدادات المجموعة', icon: 'settings', href: '/dashboard/settings' },
  ];

  return (
    <aside className="w-64 bg-white dark:bg-[#1a331a] border-l border-slate-200 dark:border-slate-800 flex flex-col justify-between shrink-0 h-screen overflow-y-auto z-20">
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center gap-3">
          <div className="bg-[#0b3d0b] bg-center bg-no-repeat aspect-square bg-cover rounded-full size-12 flex items-center justify-center text-[#d4af37]">
            <span className="material-symbols-outlined text-3xl">spa</span>
          </div>
          <div className="flex flex-col">
            <h1 className="text-slate-900 dark:text-slate-50 text-base font-bold leading-normal">مجموعة الإرادة</h1>
            <p className="text-[#0b3d0b] dark:text-[#d4af37] text-xs font-normal leading-normal">لتنمية الغدية</p>
          </div>
        </div>
        <nav className="flex flex-col gap-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group ${
                  isActive
                    ? 'bg-[#0b3d0b]/5 text-[#0b3d0b] dark:text-[#d4af37] font-medium'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <span
                  className={`material-symbols-outlined ${
                    isActive ? 'fill-current' : 'group-hover:text-[#0b3d0b] dark:group-hover:text-[#d4af37]'
                  } transition-colors`}
                >
                  {item.icon}
                </span>
                <span
                  className={`text-sm ${
                    isActive ? '' : 'group-hover:text-slate-900 dark:group-hover:text-slate-200'
                  } transition-colors`}
                >
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <span className="material-symbols-outlined">logout</span>
          <span className="text-sm font-medium">تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  );
}
