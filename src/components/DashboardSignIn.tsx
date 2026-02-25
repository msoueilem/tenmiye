'use client';

import React, { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { useRouter } from 'next/navigation';

export function DashboardSignIn() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  React.useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.push('/dashboard');
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleGoogleLogin = async () => {
    if (!auth) return;
    setLoading(true);
    setError('');

    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(
        'حدث خطأ أثناء تسجيل الدخول. يرجى التأكد من حسابك والمحاولة مرة أخرى.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-dashboard-bg-light font-dashboard dark:bg-dashboard-bg-dark flex min-h-screen flex-col text-slate-900 dark:text-slate-100">
      {/* Main Content Area */}
      <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-4 py-8">
        {/* Abstract Background Pattern */}
        <div className="pointer-events-none absolute inset-0 z-0 opacity-10">
          <div className="bg-dashboard-primary/30 absolute -top-20 -right-20 h-96 w-96 rounded-full blur-3xl"></div>
          <div className="bg-dashboard-primary/10 absolute bottom-0 left-0 h-[500px] w-[500px] rounded-full blur-3xl"></div>
        </div>

        <div className="z-10 flex w-full max-w-5xl flex-col items-center gap-8 lg:flex-row lg:gap-16">
          {/* Left Side: Visual/Information */}
          <div className="order-2 flex w-full flex-1 flex-col gap-6 lg:order-1 lg:w-1/2">
            <div className="group dark:border-dashboard-primary/20 relative h-64 w-full overflow-hidden rounded-2xl border border-slate-200 shadow-2xl lg:h-96">
              <div className="from-dashboard-bg-dark/90 absolute inset-0 z-10 bg-gradient-to-t to-transparent"></div>
              <div
                className="h-full w-full transform bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                style={{
                  backgroundImage:
                    'url("https://lh3.googleusercontent.com/aida-public/AB6AXuAl49zCu7wa3hLtY4u7-U8JkpYS9WYVjbyQq0uJwo5GXgL9NPmPg-V9VCBwJ-EDXxyHkgFdvLcx-qm5xW1qh-zlAjGIiQTsM4XY7F-1dc4KXD-8xEbJ9xW0cOjYSR9dl-XQ3oHQU0bLHYxJCEBI-IejXPzox6EfV4YGyV1GrA3NmSTQrAB-fJRvR-LuAQmggMEld5GkbaeihZJiPOguuKUEj7OtHcvEH9iMALE-EIG2cpnolzEmooQY6oKOqGTZby3JT6noMwdGTAcz")',
                }}
              ></div>
              <div className="absolute right-0 bottom-0 left-0 z-20 p-6 text-white">
                <p className="text-dashboard-primary mb-2 flex items-center gap-2 text-sm font-bold">
                  <span className="material-symbols-outlined text-sm">
                    verified_user
                  </span>
                  بوابة آمنة
                </p>
                <h3 className="mb-2 text-2xl font-bold">
                  النظام الإداري المركزي
                </h3>
                <p className="text-sm leading-relaxed text-slate-300 opacity-90">
                  منصة متكاملة لإدارة الموارد وتوجيه الاستراتيجيات المستقبلية
                  لمجموعة الإرادة. تضمن هذه البوابة أعلى معايير الأمان والخصوصية
                  للبيانات الحساسة.
                </p>
              </div>
            </div>
          </div>

          {/* Right Side: Login Form */}
          <div className="order-1 flex w-full flex-1 flex-col justify-center lg:order-2 lg:w-1/2">
            <div className="dark:border-dashboard-primary/10 relative mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-slate-100 bg-white p-8 shadow-xl md:p-10 dark:bg-[#1a2e1d]">
              {/* Decorative top accent */}
              <div className="from-dashboard-primary absolute top-0 right-0 left-0 h-1 bg-gradient-to-r to-emerald-600"></div>

              <div className="mb-8 text-center">
                <div className="bg-dashboard-primary/10 text-dashboard-primary mb-4 inline-flex items-center justify-center rounded-full p-3">
                  <span className="material-symbols-outlined text-3xl">
                    admin_panel_settings
                  </span>
                </div>
                <h1 className="mb-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                  دخول المسؤول العام
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  بوابة الوصول الآمن للإدارة العليا والعمليات المركزية
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex items-start gap-3 rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800/30 dark:bg-orange-900/20">
                  <span className="material-symbols-outlined mt-0.5 shrink-0 text-orange-600 dark:text-orange-400">
                    warning
                  </span>
                  <p className="text-xs leading-relaxed text-orange-800 dark:text-orange-200">
                    <strong>تنبيه أمني:</strong> هذه المنطقة مخصصة فقط للمسؤولين
                    المصرح لهم. يتطلب الدخول حساب جوجل معتمد من قبل المنظمة.
                    سيتم تسجيل جميع محاولات الدخول.
                  </p>
                </div>

                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-center text-xs text-red-600 dark:border-red-800/30 dark:bg-red-900/20 dark:text-red-400">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="group flex h-12 w-full items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white px-6 font-medium text-slate-700 shadow-sm transition-all hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="border-t-dashboard-primary h-5 w-5 animate-spin rounded-full border-2 border-slate-300"></div>
                  ) : (
                    <svg
                      className="h-5 w-5"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      ></path>
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      ></path>
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      ></path>
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      ></path>
                    </svg>
                  )}
                  <span>تسجيل الدخول باستخدام جوجل</span>
                </button>

                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
                  <span className="mx-4 flex-shrink-0 text-xs text-slate-400">
                    أو
                  </span>
                  <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
                </div>

                <div className="text-center">
                  <a
                    className="hover:text-dashboard-primary dark:hover:text-dashboard-primary inline-flex items-center gap-1 text-sm text-slate-500 transition-colors dark:text-slate-400"
                    href="#"
                  >
                    <span className="material-symbols-outlined text-base">
                      help
                    </span>
                    هل تواجه مشكلة في الدخول؟
                  </a>
                </div>
              </div>

              <div className="mt-8 border-t border-slate-100 pt-6 text-center dark:border-slate-700/50">
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  © 2024 مجموعة الإرادة لتنمية الغدية. جميع الحقوق محفوظة.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
