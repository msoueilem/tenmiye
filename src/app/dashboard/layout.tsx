'use client';

import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { useRouter } from 'next/navigation';
import { checkAdminStatus, Admin } from '@/lib/firebase/queries';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { DashboardProvider } from '@/context/DashboardContext';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          const adminData = await checkAdminStatus(currentUser);
          setAdmin(adminData);
        } catch (err) {
          console.error('Error checking admin status:', err);
        }
      } else {
        router.push('/signin');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push('/signin');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dashboard-bg-light dark:bg-[#102210] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#d4af37] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) return null;

  if (admin && admin.status !== 'active') {
    return (
      <div className="min-h-screen bg-[#f8fcf8] dark:bg-[#102210] flex items-center justify-center p-6 text-slate-900 dark:text-slate-100" dir="rtl">
        <div className="w-full max-w-md bg-white dark:bg-[#1a331a] rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 p-8 text-center">
          <div className="mb-6 inline-flex items-center justify-center p-4 bg-orange-100 dark:bg-orange-900/20 rounded-full text-orange-600 dark:text-orange-400">
            <span className="material-symbols-outlined text-4xl">lock_person</span>
          </div>
          <h1 className="text-2xl font-black mb-2">الحساب قيد المراجعة</h1>
          <p className="text-slate-500 dark:text-slate-400 mb-8">
            تم إنشاء طلب وصول للنظام للمستخدم <span className="font-bold text-slate-700 dark:text-slate-200">{admin.email}</span>. 
            يرجى التواصل مع المدير العام لتفعيل حسابك.
          </p>
          <button 
            onClick={handleLogout}
            className="w-full h-12 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-lg transition-all"
          >
            تسجيل الخروج
          </button>
        </div>
      </div>
    );
  }

  if (admin && admin.status === 'active') {
    return (
      <DashboardProvider user={user} admin={admin}>
        <div className="flex h-screen overflow-hidden bg-[#f8fcf8] dark:bg-[#102210] text-slate-900 dark:text-slate-100" dir="rtl">
          <DashboardSidebar />
          <main className="flex-1 flex flex-col h-full overflow-hidden relative">
            {children}
          </main>
        </div>
      </DashboardProvider>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fcf8] dark:bg-[#102210] flex items-center justify-center">
      <p className="text-red-500">حدث خطأ غير متوقع في التحقق من الصلاحيات.</p>
    </div>
  );
}
