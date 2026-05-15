'use client';

import React, { useState } from 'react';
import { config } from '@/lib/config';

const PHONE_RE = /^[234]\d{7}$/;

export function JoinForm() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setPhoneError('');

    const formData = new FormData(e.currentTarget);
    const rawPhone = (formData.get('phone') as string).replace(/\s/g, '');

    if (!PHONE_RE.test(rawPhone)) {
      setPhoneError('رقم الهاتف يجب أن يكون 8 أرقام ويبدأ بـ 2 أو 3 أو 4');
      return;
    }

    const body = {
      fullName: formData.get('fullName') as string,
      phone: rawPhone,
      city: formData.get('city') as string || undefined,
    };

    setLoading(true);
    try {
      const res = await fetch(`${config.apiUrl}/registrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        const msg = Array.isArray(json.message) ? json.message[0] : json.message;
        setError(msg || 'حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى.');
        return;
      }

      setSuccess(true);
      (e.target as HTMLFormElement).reset();
    } catch {
      setError('حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-deep-green border-primary/20 flex flex-1 flex-col items-center justify-center gap-4 rounded-2xl border p-10 text-center text-white shadow-xl">
        <span className="material-symbols-outlined text-primary text-6xl">
          check_circle
        </span>
        <h2 className="text-primary text-3xl font-bold">
          تم إرسال طلبك بنجاح!
        </h2>
        <p className="text-slate-300">
          شكراً لانضمامك إلينا. سنتواصل معك قريباً عبر الواتساب.
        </p>
        <button
          onClick={() => setSuccess(false)}
          className="text-primary mt-4 underline transition-colors hover:text-white"
        >
          إرسال طلب آخر
        </button>
      </div>
    );
  }

  return (
    <div className="bg-deep-green border-primary/20 relative flex flex-1 flex-col gap-6 overflow-hidden rounded-2xl border p-10 text-white shadow-xl">
      <div className="bg-primary/10 absolute top-0 right-0 h-64 w-64 translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"></div>
      <h2 className="text-primary relative z-10 text-3xl font-bold">
        استمارة الانضمام
      </h2>
      <p className="relative z-10 text-slate-300">
        كن جزءاً من التغيير وشاركنا في بناء مستقبل أفضل لمدينتنا.
      </p>

      <form
        onSubmit={handleSubmit}
        className="relative z-10 mt-2 flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="fullName" className="text-sm font-medium text-slate-200">
            الاسم الكامل
          </label>
          <input
            id="fullName"
            name="fullName"
            required
            className="focus:ring-primary h-12 w-full rounded-lg border border-white/20 bg-white/10 px-4 text-white placeholder-white/40 focus:ring-2 focus:outline-none"
            placeholder="الاسم الثلاثي"
            type="text"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="phone" className="text-sm font-medium text-slate-200">
            رقم الواتساب (موريتانيا)
          </label>
          <div className="relative">
            <input
              id="phone"
              name="phone"
              required
              className="focus:ring-primary h-12 w-full rounded-lg border border-white/20 bg-white/10 px-4 pl-20 text-left text-white placeholder-white/40 focus:ring-2 focus:outline-none"
              dir="ltr"
              placeholder="20 12 34 56"
              type="tel"
              maxLength={11}
            />
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center rounded-l-lg border-r border-white/20 bg-white/5 px-3 text-slate-300">
              +222
            </div>
          </div>
          {phoneError && <p className="text-sm text-red-400">{phoneError}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="city" className="text-sm font-medium text-slate-200">
            الموقع / المدينة
          </label>
          <select
            id="city"
            name="city"
            required
            className="focus:ring-primary h-12 w-full rounded-lg border border-white/20 bg-white/10 px-4 text-white focus:ring-2 focus:outline-none [&>option]:text-slate-900"
          >
            <option disabled value="">
              اختر المنطقة
            </option>
            <option value="nouakchott">نواكشوط</option>
            <option value="nouadhibou">نواذيبو</option>
            <option value="kiffa">كيفه</option>
            <option value="rosso">روصو</option>
            <option value="kaedi">كيهيدي</option>
            <option value="zouerat">ازويرات</option>
            <option value="other">أخرى</option>
          </select>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          disabled={loading}
          className="bg-primary text-deep-green mt-4 h-12 cursor-pointer rounded-lg font-bold shadow-lg shadow-black/20 transition-all hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-50"
          type="submit"
        >
          {loading ? 'جاري الإرسال...' : 'تأكيد الانضمام'}
        </button>
      </form>
    </div>
  );
}
