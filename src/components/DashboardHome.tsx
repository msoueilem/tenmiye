'use client';

import { signOut, User } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { useRouter } from 'next/navigation';
import { Admin } from '@/lib/firebase/queries';

export function DashboardHome({ user, admin }: { user: User; admin: Admin }) {
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-dashboard-bg-light p-6 font-dashboard text-slate-900 dark:bg-dashboard-bg-dark dark:text-slate-100">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-100 bg-white p-8 shadow-xl dark:border-dashboard-primary/10 dark:bg-[#1a2e1d] md:p-10 text-center">
        <div className="mb-6">
          {user.photoURL ? (
            <img 
              src={user.photoURL} 
              alt={user.displayName || 'User'} 
              className="mx-auto h-24 w-24 rounded-full border-4 border-dashboard-primary/20 shadow-lg"
            />
          ) : (
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-dashboard-primary/10 text-dashboard-primary">
              <span className="material-symbols-outlined">person</span>
            </div>
          )}
        </div>

        <h1 className="mb-2 text-3xl font-black">
          مرحباً بك، {user.displayName || 'أيها المسؤول'}!
        </h1>
        <div className="mb-8 flex items-center justify-center gap-3">
          <span className="rounded-full bg-dashboard-primary/10 px-3 py-1 text-xs font-bold text-dashboard-primary">
            {admin.role === 'super-admin' ? 'مدير عام' : 'محرر'}
          </span>
          <span className="text-sm text-slate-500 dark:text-slate-400">{user.email}</span>
        </div>

        <div className="mb-8 overflow-hidden rounded-xl bg-slate-50 p-6 text-left dark:bg-slate-900/50">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-dashboard-primary">
            <span className="material-symbols-outlined">code</span>
            بيانات الصلاحيات (Firestore):
          </h3>
          <pre className="break-all whitespace-pre-wrap font-mono text-[10px] text-slate-600 dark:text-slate-400 md:text-xs">
            {JSON.stringify(admin, null, 2)}
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
