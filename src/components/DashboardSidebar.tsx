'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useDashboard } from '@/context/DashboardContext';
import { ThemeToggle } from '@/components/ThemeToggle';

export const adminNavItems = [
  { name: 'لوحة التحكم', icon: 'dashboard', href: '/admin' },
  { name: 'الأعضاء', icon: 'group', href: '/admin/members' },
  { name: 'مجالس الإدارة', icon: 'corporate_fare', href: '/admin/boards' },
  { name: 'الإعلانات', icon: 'campaign', href: '/admin/announcements' },
  { name: 'المدونة', icon: 'article', href: '/admin/blog' },
  { name: 'الشؤون المالية', icon: 'payments', href: '/admin/finance' },
  { name: 'إدارة الانتخابات', icon: 'how_to_vote', href: '/admin/elections' },
  { name: 'الأدوار', icon: 'badge', href: '/admin/roles' },
  { name: 'فئات العضوية', icon: 'layers', href: '/admin/tiers' },
  { name: 'حسابات المشرفين', icon: 'admin_panel_settings', href: '/admin/admin-accounts' },
  { name: 'إعدادات المجموعة', icon: 'settings', href: '/admin/settings' },
];

// Active when the path is the item itself or a sub-route (e.g. /admin/members/123).
// '/admin' is matched exactly so it doesn't light up for every nested page.
export function isNavActive(pathname: string, href: string): boolean {
  if (href === '/admin') return pathname === '/admin';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardSidebar({
  mobileOpen,
  onClose,
}: {
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const { logout } = useDashboard();

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const handleLogout = async () => {
    await logout();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed top-0 right-0 z-40 flex h-screen w-72 max-w-[82vw] shrink-0 transform flex-col justify-between overflow-y-auto border-l border-slate-200 bg-white transition-transform duration-300 ease-in-out dark:border-slate-800 dark:bg-[#1a331a] lg:static lg:z-20 lg:w-64 lg:max-w-none lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col gap-6 p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-[#0b3d0b] bg-center bg-no-repeat aspect-square bg-cover rounded-full size-12 flex items-center justify-center text-[#d4af37]">
                <span className="material-symbols-outlined text-3xl">spa</span>
              </div>
              <div className="flex flex-col">
                <h1 className="text-slate-900 dark:text-slate-50 text-base font-bold leading-normal">مجموعة الإرادة</h1>
                <p className="text-[#0b3d0b] dark:text-[#d4af37] text-xs font-normal leading-normal">لتنمية الغدية</p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="إغلاق القائمة"
              className="lg:hidden cursor-pointer text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <nav className="flex flex-col gap-2">
            {adminNavItems.map((item) => {
              const isActive = isNavActive(pathname, item.href);
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
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-1">
          <ThemeToggle
            showLabel
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer text-sm font-medium"
          />
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <span className="material-symbols-outlined">logout</span>
            <span className="text-sm font-medium">تسجيل الخروج</span>
          </button>
        </div>
      </aside>
    </>
  );
}
