'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch, tokenStore } from '@/lib/api';
import { useMemberAuth } from '@/context/MemberAuthContext';

type Step = 'phone' | 'otp' | 'password' | 'set-password' | 'forgot-otp' | 'forgot-set';

interface PhoneCheckResult {
  isMember: boolean;
  hasPassword: boolean;
}

interface TokenPair {
  access_token: string;
  refresh_token: string;
}

function MemberSignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useMemberAuth();

  const redirectTo = searchParams.get('redirect') ?? '/';

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [sessionInfo, setSessionInfo] = useState('');
  const [pendingTokens, setPendingTokens] = useState<TokenPair | null>(null);
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // If already logged in, redirect immediately
  useEffect(() => {
    if (tokenStore.getAccess('member')) {
      router.replace(redirectTo);
    }
  }, [redirectTo, router]);

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length < 8) return;
    setLoading(true);
    setError('');
    try {
      const result = await apiFetch<PhoneCheckResult>('POST', '/auth/phone/check', {
        body: { phone },
      });
      if (!result.isMember) {
        setError('رقم الهاتف غير مسجل في قائمة الأعضاء.');
        return;
      }
      if (result.hasPassword) {
        setStep('password');
      } else {
        await sendOtp();
      }
    } catch {
      setError('تعذّر التحقق من رقم الهاتف. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const sendOtp = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await apiFetch<{ sessionInfo: string }>('POST', '/auth/phone/request-otp', {
        body: { phone },
      });
      setSessionInfo(result.sessionInfo);
      setStep('otp');
    } catch {
      setError('فشل إرسال رمز التحقق. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length < 6) return;
    setLoading(true);
    setError('');
    try {
      const result = await apiFetch<TokenPair & { requiresPasswordSetup: boolean }>(
        'POST',
        '/auth/phone/verify-otp',
        { body: { sessionInfo, code: otpCode } },
      );
      if (result.requiresPasswordSetup) {
        setPendingTokens({ access_token: result.access_token, refresh_token: result.refresh_token });
        setStep('set-password');
      } else {
        login(result.access_token, result.refresh_token);
        router.replace(redirectTo);
      }
    } catch {
      setError('رمز التحقق غير صحيح أو منتهي الصلاحية.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError('');
    try {
      const result = await apiFetch<TokenPair>('POST', '/auth/login', {
        body: { phone, password },
      });
      login(result.access_token, result.refresh_token);
      router.replace(redirectTo);
    } catch {
      setError('كلمة المرور غير صحيحة. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await apiFetch<{ sessionInfo: string }>('POST', '/auth/phone/request-otp', {
        body: { phone },
      });
      setSessionInfo(result.sessionInfo);
      setOtpCode('');
      setStep('forgot-otp');
    } catch {
      setError('فشل إرسال رمز التحقق. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length < 6) return;
    setLoading(true);
    setError('');
    try {
      const result = await apiFetch<TokenPair & { requiresPasswordSetup: boolean }>(
        'POST',
        '/auth/phone/verify-otp',
        { body: { sessionInfo, code: otpCode } },
      );
      setPendingTokens({ access_token: result.access_token, refresh_token: result.refresh_token });
      setNewPassword('');
      setConfirmPassword('');
      setStep('forgot-set');
    } catch {
      setError('رمز التحقق غير صحيح أو منتهي الصلاحية.');
    } finally {
      setLoading(false);
    }
  };

  const handleSetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين.');
      return;
    }
    if (!pendingTokens) return;
    setLoading(true);
    setError('');
    try {
      // Temporarily place token so apiFetch can read it for the guarded endpoint
      tokenStore.set('member', pendingTokens.access_token, pendingTokens.refresh_token);
      await apiFetch<{ message: string }>('POST', '/auth/phone/set-password', {
        body: { password: newPassword },
        tokenType: 'member',
      });
      login(pendingTokens.access_token, pendingTokens.refresh_token);
      router.replace(redirectTo);
    } catch {
      tokenStore.clear('member');
      setError('تعذّر تعيين كلمة المرور. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const phoneDisplay = phone.startsWith('+') ? phone : `+222 ${phone}`;

  return (
    <div className="min-h-screen bg-[#f5f8f5] dark:bg-[#102210] flex items-center justify-center p-6" dir="rtl">
      <div className="w-full max-w-lg bg-white dark:bg-[#1a331a] rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800">
        <div className="p-8 sm:p-12">
          <div className="flex justify-center mb-8">
            <div className="size-16 rounded-2xl bg-[#0df20d]/10 text-[#0df20d] flex items-center justify-center">
              <span className="material-symbols-outlined text-4xl">person</span>
            </div>
          </div>

          <div className="text-center mb-10">
            <h1 className="text-3xl font-black mb-2 text-slate-900 dark:text-white">دخول الأعضاء</h1>
            <p className="text-slate-500">بوابة الدخول الآمن لأعضاء مجموعة الإرادة</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold border border-red-100 flex items-center gap-3">
              <span className="material-symbols-outlined text-lg">error</span>
              {error}
            </div>
          )}

          {step === 'phone' && (
            <form onSubmit={handlePhoneSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">رقم الهاتف</label>
                <div className="relative group">
                  <input
                    className="w-full h-14 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 pr-12 text-left font-black text-xl outline-none focus:ring-4 focus:ring-[#0df20d]/10 transition-all"
                    type="tel"
                    placeholder="xx xx xx xx"
                    dir="ltr"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    maxLength={12}
                    required
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 group-focus-within:text-[#0df20d]">call</span>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading || phone.length < 8}
                className="w-full h-14 bg-[#0df20d] text-slate-900 rounded-2xl font-black text-lg hover:bg-[#0be00b] transition-all shadow-lg shadow-[#0df20d]/20 disabled:opacity-50"
              >
                {loading ? 'جاري التحقق...' : 'متابعة'}
              </button>
            </form>
          )}

          {step === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-6">
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
                <p className="text-xs text-slate-500 mb-1">رقم الهاتف</p>
                <p className="font-black text-lg" dir="ltr">{phoneDisplay}</p>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">كلمة المرور</label>
                <input
                  className="w-full h-14 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 font-bold text-lg outline-none focus:ring-4 focus:ring-[#0df20d]/10 transition-all"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={loading || !password}
                className="w-full h-14 bg-[#0df20d] text-slate-900 rounded-2xl font-black text-lg hover:bg-[#0be00b] transition-all shadow-lg shadow-[#0df20d]/20 disabled:opacity-50"
              >
                {loading ? 'جاري الدخول...' : 'دخول'}
              </button>
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={loading}
                className="w-full text-sm text-[#0df20d]/70 font-bold hover:text-[#0df20d] disabled:opacity-50"
              >
                نسيت كلمة المرور؟
              </button>
              <button
                type="button"
                onClick={() => { setStep('phone'); setPassword(''); setError(''); }}
                className="w-full text-sm text-slate-400 font-bold hover:text-slate-600"
              >
                تغيير رقم الهاتف
              </button>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={handleOtpSubmit} className="space-y-6">
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
                <p className="text-xs text-slate-500 mb-1">تم إرسال رمز التحقق إلى</p>
                <p className="font-black text-lg" dir="ltr">{phoneDisplay}</p>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">رمز التحقق</label>
                <input
                  className="w-full h-14 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 text-center font-black text-xl tracking-[0.5em] outline-none focus:ring-4 focus:ring-[#0df20d]/10"
                  type="text"
                  placeholder="000000"
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value)}
                  maxLength={6}
                  dir="ltr"
                  autoFocus
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading || otpCode.length < 6}
                className="w-full h-14 bg-[#0df20d] text-slate-900 rounded-2xl font-black text-lg hover:bg-[#0be00b] transition-all shadow-lg shadow-[#0df20d]/20 disabled:opacity-50"
              >
                {loading ? 'جاري التحقق...' : 'تأكيد'}
              </button>
              <button
                type="button"
                onClick={() => { setStep('phone'); setOtpCode(''); setError(''); }}
                className="w-full text-sm text-slate-400 font-bold hover:text-slate-600"
              >
                تغيير رقم الهاتف
              </button>
            </form>
          )}

          {step === 'set-password' && (
            <form onSubmit={handleSetPasswordSubmit} className="space-y-6">
              <div className="p-4 bg-[#0df20d]/5 rounded-2xl border border-[#0df20d]/20 text-center">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">مرحباً بك! يرجى تعيين كلمة مرور لتسهيل الدخول في المرات القادمة</p>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">كلمة المرور الجديدة <span className="font-normal text-slate-400">(8 أحرف على الأقل)</span></label>
                <input
                  className="w-full h-14 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 font-bold text-lg outline-none focus:ring-4 focus:ring-[#0df20d]/10 transition-all"
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  autoFocus
                  minLength={8}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">تأكيد كلمة المرور</label>
                <input
                  className="w-full h-14 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 font-bold text-lg outline-none focus:ring-4 focus:ring-[#0df20d]/10 transition-all"
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !newPassword || newPassword !== confirmPassword}
                className="w-full h-14 bg-[#0df20d] text-slate-900 rounded-2xl font-black text-lg hover:bg-[#0be00b] transition-all shadow-lg shadow-[#0df20d]/20 disabled:opacity-50"
              >
                {loading ? 'جاري الحفظ...' : 'حفظ وتسجيل الدخول'}
              </button>
            </form>
          )}
          {step === 'forgot-otp' && (
            <form onSubmit={handleForgotOtpSubmit} className="space-y-6">
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
                <p className="text-xs text-slate-500 mb-1">تم إرسال رمز التحقق إلى</p>
                <p className="font-black text-lg" dir="ltr">{phoneDisplay}</p>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">رمز التحقق</label>
                <input
                  className="w-full h-14 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 text-center font-black text-xl tracking-[0.5em] outline-none focus:ring-4 focus:ring-[#0df20d]/10"
                  type="text"
                  placeholder="000000"
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value)}
                  maxLength={6}
                  dir="ltr"
                  autoFocus
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading || otpCode.length < 6}
                className="w-full h-14 bg-[#0df20d] text-slate-900 rounded-2xl font-black text-lg hover:bg-[#0be00b] transition-all shadow-lg shadow-[#0df20d]/20 disabled:opacity-50"
              >
                {loading ? 'جاري التحقق...' : 'تأكيد'}
              </button>
              <button
                type="button"
                onClick={() => { setStep('password'); setOtpCode(''); setError(''); }}
                className="w-full text-sm text-slate-400 font-bold hover:text-slate-600"
              >
                العودة
              </button>
            </form>
          )}

          {step === 'forgot-set' && (
            <form onSubmit={handleSetPasswordSubmit} className="space-y-6">
              <div className="p-4 bg-[#0df20d]/5 rounded-2xl border border-[#0df20d]/20 text-center">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">أدخل كلمة مرور جديدة لحسابك</p>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">كلمة المرور الجديدة <span className="font-normal text-slate-400">(8 أحرف على الأقل)</span></label>
                <input
                  className="w-full h-14 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 font-bold text-lg outline-none focus:ring-4 focus:ring-[#0df20d]/10 transition-all"
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  autoFocus
                  minLength={8}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">تأكيد كلمة المرور</label>
                <input
                  className="w-full h-14 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 font-bold text-lg outline-none focus:ring-4 focus:ring-[#0df20d]/10 transition-all"
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !newPassword || newPassword !== confirmPassword}
                className="w-full h-14 bg-[#0df20d] text-slate-900 rounded-2xl font-black text-lg hover:bg-[#0be00b] transition-all shadow-lg shadow-[#0df20d]/20 disabled:opacity-50"
              >
                {loading ? 'جاري الحفظ...' : 'حفظ وتسجيل الدخول'}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}

export default function MemberSignInPage() {
  return (
    <Suspense>
      <MemberSignInForm />
    </Suspense>
  );
}
