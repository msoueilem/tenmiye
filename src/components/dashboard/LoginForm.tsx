'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMemberAuth } from '@/context/MemberAuthContext';
import { config } from '@/lib/config';

const PHONE_RE = /^[234]\d{7}$/;

type Step =
  | 'phone'
  | 'password'
  | 'otp-first'
  | 'forgot-otp'
  | 'forgot-new-password';

interface ApiError {
  message?: string | string[];
}

function getApiMessage(json: ApiError): string {
  const m = json.message;
  if (!m) return '';
  return Array.isArray(m) ? m[0] : m;
}

export function LoginForm() {
  const router = useRouter();
  const { login } = useMemberAuth();

  const [step, setStep] = useState<Step>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Collected across steps
  const [phone, setPhone] = useState('');
  const [sessionInfo, setSessionInfo] = useState('');

  // ─── Helpers ────────────────────────────────────────────────────────────────

  async function post<T>(path: string, body: unknown, token?: string): Promise<{ ok: boolean; data: T }> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${config.apiUrl}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({})) as T;
    return { ok: res.ok, data };
  }

  async function requestOtp(p: string): Promise<string | null> {
    const { ok, data } = await post<{ sessionInfo?: string } & ApiError>('/auth/phone/request-otp', { phone: p });
    if (!ok) { setError(getApiMessage(data) || 'فشل إرسال رمز التحقق، حاول مرة أخرى.'); return null; }
    return (data as { sessionInfo: string }).sessionInfo;
  }

  // ─── Step: phone ─────────────────────────────────────────────────────────────

  async function handlePhoneSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const raw = (new FormData(e.currentTarget).get('phone') as string).replace(/\s/g, '');
    if (!PHONE_RE.test(raw)) { setError('رقم الهاتف يجب أن يكون 8 أرقام ويبدأ بـ 2 أو 3 أو 4'); return; }

    setLoading(true);
    try {
      const { ok, data } = await post<{ isMember: boolean; hasPassword: boolean } & ApiError>(
        '/auth/phone/check', { phone: raw },
      );
      if (!ok) { setError(getApiMessage(data) || 'حدث خطأ، حاول مرة أخرى.'); return; }

      const { isMember, hasPassword } = data as { isMember: boolean; hasPassword: boolean };

      if (!isMember) {
        setError('هذا الرقم غير مسجل كعضو. التسجيل متاح عبر الصفحة الرئيسية.');
        return;
      }

      setPhone(raw);

      if (hasPassword) {
        setStep('password');
      } else {
        // First-time member — auto-request OTP
        const si = await requestOtp(raw);
        if (si) { setSessionInfo(si); setStep('otp-first'); }
      }
    } catch {
      setError('حدث خطأ في الاتصال. تأكد من اتصالك بالإنترنت.');
    } finally {
      setLoading(false);
    }
  }

  // ─── Step: password ──────────────────────────────────────────────────────────

  async function handlePasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const password = new FormData(e.currentTarget).get('password') as string;

    setLoading(true);
    try {
      const { ok, data } = await post<{ access_token?: string; refresh_token?: string } & ApiError>(
        '/auth/login', { phone, password },
      );
      if (!ok) { setError(getApiMessage(data) || 'كلمة المرور غير صحيحة.'); return; }
      const { access_token, refresh_token } = data as { access_token: string; refresh_token: string };
      login(access_token, refresh_token);
      router.push('/dashboard');
    } catch {
      setError('حدث خطأ في الاتصال.');
    } finally {
      setLoading(false);
    }
  }

  // ─── Step: otp-first (first-time login) ──────────────────────────────────────

  async function handleOtpFirstSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const code = new FormData(e.currentTarget).get('otp') as string;

    setLoading(true);
    try {
      const { ok, data } = await post<{
        access_token?: string;
        refresh_token?: string;
        requiresPasswordSetup?: boolean;
      } & ApiError>('/auth/phone/verify-otp', { sessionInfo, code });

      if (!ok) { setError(getApiMessage(data) || 'رمز التحقق غير صحيح أو انتهت صلاحيته.'); return; }

      const { access_token, refresh_token, requiresPasswordSetup } = data as {
        access_token: string;
        refresh_token: string;
        requiresPasswordSetup: boolean;
      };

      if (requiresPasswordSetup) {
        // Store token temporarily so set-password can use it
        login(access_token, refresh_token);
        router.push('/dashboard/set-password');
      } else {
        login(access_token, refresh_token);
        router.push('/dashboard');
      }
    } catch {
      setError('حدث خطأ في الاتصال.');
    } finally {
      setLoading(false);
    }
  }

  // ─── Forgot password flow ────────────────────────────────────────────────────

  async function handleForgotPassword() {
    setError('');
    setLoading(true);
    try {
      const si = await requestOtp(phone);
      if (si) { setSessionInfo(si); setStep('forgot-otp'); }
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotOtpSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    // Just validate the OTP code and carry sessionInfo forward
    const code = new FormData(e.currentTarget).get('otp') as string;
    if (code.length < 4) { setError('أدخل رمز التحقق كاملاً.'); return; }
    // Store code in sessionInfo field temporarily (we pass both to reset-password)
    setSessionInfo((prev) => `${prev}|${code}`);
    setStep('forgot-new-password');
  }

  async function handleNewPasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const newPassword = new FormData(e.currentTarget).get('password') as string;
    const [si, code] = sessionInfo.split('|');

    setLoading(true);
    try {
      const { ok, data } = await post<ApiError>('/auth/phone/reset-password', {
        sessionInfo: si, code, newPassword,
      });
      if (!ok) { setError(getApiMessage(data) || 'فشل إعادة تعيين كلمة المرور.'); return; }
      // After reset, go back to password login so user can sign in
      setStep('password');
      setError('');
      setSessionInfo('');
    } catch {
      setError('حدث خطأ في الاتصال.');
    } finally {
      setLoading(false);
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  const card = 'rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-8 shadow-2xl';
  const input = 'h-12 w-full rounded-lg border border-white/20 bg-white/10 px-4 text-white placeholder-white/30 focus:border-[#0df20d]/50 focus:ring-1 focus:ring-[#0df20d]/50 focus:outline-none transition-colors';
  const label = 'block text-sm font-medium text-slate-300 mb-1';
  const btn = 'w-full h-12 rounded-lg bg-[#0df20d] text-[#071a07] font-bold text-base hover:bg-[#0df20d]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer';
  const ghost = 'text-sm text-[#0df20d] underline cursor-pointer hover:text-white transition-colors';

  // ── Phase 1: Phone ──────────────────────────────────────────────────────────
  if (step === 'phone') {
    return (
      <div className={card}>
        <h2 className="text-xl font-bold text-white mb-6">أدخل رقم هاتفك</h2>
        <form onSubmit={handlePhoneSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="phone" className={label}>رقم الهاتف</label>
            <div className="relative">
              <input
                id="phone"
                name="phone"
                required
                type="tel"
                dir="ltr"
                placeholder="20 12 34 56"
                maxLength={11}
                className={`${input} pl-16`}
              />
              <span className="absolute inset-y-0 left-0 flex items-center px-3 text-slate-400 text-sm border-r border-white/20 select-none">
                +222
              </span>
            </div>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button type="submit" disabled={loading} className={btn}>
            {loading ? 'جاري التحقق...' : 'متابعة'}
          </button>
        </form>
      </div>
    );
  }

  // ── Phase 2a: Password ──────────────────────────────────────────────────────
  if (step === 'password') {
    return (
      <div className={card}>
        <button onClick={() => { setStep('phone'); setError(''); }} className={`${ghost} mb-4 flex items-center gap-1`}>
          ← تغيير الرقم
        </button>
        <h2 className="text-xl font-bold text-white mb-1">أدخل كلمة المرور</h2>
        <p className="text-slate-400 text-sm mb-6 dir-ltr" dir="ltr">+222 {phone}</p>
        <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="password" className={label}>كلمة المرور</label>
            <input id="password" name="password" required type="password" className={input} />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button type="submit" disabled={loading} className={btn}>
            {loading ? 'جاري الدخول...' : 'تسجيل الدخول'}
          </button>
          <div className="text-center">
            <button type="button" onClick={handleForgotPassword} disabled={loading} className={ghost}>
              {loading ? 'جاري إرسال الرمز...' : 'نسيت كلمة المرور؟'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ── Phase 2b: OTP (first-time) ──────────────────────────────────────────────
  if (step === 'otp-first') {
    return (
      <div className={card}>
        <button onClick={() => { setStep('phone'); setError(''); }} className={`${ghost} mb-4 flex items-center gap-1`}>
          ← تغيير الرقم
        </button>
        <h2 className="text-xl font-bold text-white mb-1">رمز التحقق</h2>
        <p className="text-slate-400 text-sm mb-6">
          تم إرسال رمز مكوّن من 6 أرقام إلى{' '}
          <span dir="ltr" className="text-white font-mono">+222 {phone}</span>
        </p>
        <form onSubmit={handleOtpFirstSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="otp" className={label}>رمز التحقق</label>
            <input
              id="otp"
              name="otp"
              required
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="------"
              dir="ltr"
              className={`${input} tracking-[0.5em] text-center font-mono`}
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button type="submit" disabled={loading} className={btn}>
            {loading ? 'جاري التحقق...' : 'تأكيد'}
          </button>
        </form>
      </div>
    );
  }

  // ── Forgot: OTP entry ───────────────────────────────────────────────────────
  if (step === 'forgot-otp') {
    return (
      <div className={card}>
        <button onClick={() => { setStep('password'); setError(''); }} className={`${ghost} mb-4 flex items-center gap-1`}>
          ← رجوع
        </button>
        <h2 className="text-xl font-bold text-white mb-1">إعادة تعيين كلمة المرور</h2>
        <p className="text-slate-400 text-sm mb-6">
          أدخل الرمز المرسل إلى{' '}
          <span dir="ltr" className="text-white font-mono">+222 {phone}</span>
        </p>
        <form onSubmit={handleForgotOtpSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="otp" className={label}>رمز التحقق</label>
            <input
              id="otp"
              name="otp"
              required
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="------"
              dir="ltr"
              className={`${input} tracking-[0.5em] text-center font-mono`}
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button type="submit" disabled={loading} className={btn}>
            متابعة
          </button>
        </form>
      </div>
    );
  }

  // ── Forgot: new password ────────────────────────────────────────────────────
  if (step === 'forgot-new-password') {
    return (
      <div className={card}>
        <h2 className="text-xl font-bold text-white mb-6">كلمة المرور الجديدة</h2>
        <form onSubmit={handleNewPasswordSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="password" className={label}>كلمة المرور الجديدة</label>
            <input id="password" name="password" required type="password" minLength={8} className={input} />
            <p className="text-xs text-slate-500 mt-1">8 أحرف على الأقل</p>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button type="submit" disabled={loading} className={btn}>
            {loading ? 'جاري الحفظ...' : 'حفظ كلمة المرور'}
          </button>
        </form>
      </div>
    );
  }

  return null;
}
