'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMemberAuth } from '@/context/MemberAuthContext';

const API = () => process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

export default function SetPasswordPage() {
  const { user, loading, getAccessToken } = useMemberAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/dashboard/login');
  }, [user, loading, router]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const password = new FormData(e.currentTarget).get('password') as string;
    const confirm = new FormData(e.currentTarget).get('confirm') as string;

    if (password !== confirm) { setError('كلمتا المرور غير متطابقتين'); return; }

    setSubmitting(true);
    try {
      const token = await getAccessToken();
      const res = await fetch(`${API()}/auth/phone/set-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({})) as { message?: string | string[] };
        const m = json.message;
        setError(Array.isArray(m) ? m[0] : m ?? 'حدث خطأ.');
        return;
      }
      setDone(true);
      setTimeout(() => router.push('/dashboard'), 1500);
    } catch {
      setError('حدث خطأ في الاتصال.');
    } finally {
      setSubmitting(false);
    }
  }

  const input = 'h-12 w-full rounded-lg border border-white/20 bg-white/10 px-4 text-white placeholder-white/30 focus:border-[#0df20d]/50 focus:ring-1 focus:ring-[#0df20d]/50 focus:outline-none';
  const label = 'block text-sm font-medium text-slate-300 mb-1';

  if (loading) return null;

  return (
    <div dir="rtl" className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0b3d0b] to-[#071a07] px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-sm">
        {done ? (
          <div className="text-center">
            <p className="text-2xl font-bold text-[#0df20d]">✓ تم تعيين كلمة المرور</p>
            <p className="mt-2 text-slate-400">جاري التحويل...</p>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-bold text-white mb-2">تعيين كلمة المرور</h2>
            <p className="text-slate-400 text-sm mb-6">ستُستخدم كلمة المرور هذه لتسجيل الدخول مستقبلاً.</p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label htmlFor="password" className={label}>كلمة المرور</label>
                <input id="password" name="password" required type="password" minLength={8} className={input} />
                <p className="text-xs text-slate-500 mt-1">8 أحرف على الأقل</p>
              </div>
              <div>
                <label htmlFor="confirm" className={label}>تأكيد كلمة المرور</label>
                <input id="confirm" name="confirm" required type="password" minLength={8} className={input} />
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="w-full h-12 rounded-lg bg-[#0df20d] text-[#071a07] font-bold hover:bg-[#0df20d]/90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                {submitting ? 'جاري الحفظ...' : 'حفظ وتسجيل الدخول'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
