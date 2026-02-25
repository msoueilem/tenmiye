'use client';

import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';

export function JoinForm() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!db) return;

    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const data = {
      fullName: formData.get('fullName'),
      whatsapp: formData.get('whatsapp'),
      location: formData.get('location'),
      committed: formData.get('commitment') === 'on',
      createdAt: serverTimestamp(),
    };

    try {
      await addDoc(collection(db, 'join-requests-simple'), data);
      setSuccess(true);
      e.currentTarget.reset();
    } catch (err) {
      console.error('Error saving join request:', err);
      setError('حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى.');
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
          <label className="text-sm font-medium text-slate-200">
            الاسم الكامل
          </label>
          <input
            name="fullName"
            required
            className="focus:ring-primary h-12 w-full rounded-lg border border-white/20 bg-white/10 px-4 text-white placeholder-white/40 focus:ring-2 focus:outline-none"
            placeholder="الاسم الثلاثي"
            type="text"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-200">
            رقم الواتساب (موريتانيا)
          </label>
          <div className="relative">
            <input
              name="whatsapp"
              required
              className="focus:ring-primary h-12 w-full rounded-lg border border-white/20 bg-white/10 px-4 pl-20 text-left text-white placeholder-white/40 focus:ring-2 focus:outline-none"
              dir="ltr"
              placeholder="222 1234 5678"
              type="tel"
            />
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center rounded-l-lg border-r border-white/20 bg-white/5 px-3 text-slate-300">
              +222
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-200">
            الموقع / المدينة
          </label>
          <select
            name="location"
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

        <div className="mt-2 flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-4">
          <input
            name="commitment"
            className="text-primary focus:ring-primary h-5 w-5 rounded border-gray-300 bg-white/80"
            id="commitment"
            type="checkbox"
          />
          <label
            className="cursor-pointer text-sm text-slate-200"
            htmlFor="commitment"
          >
            هل أنت مستعد للانضمام إلى هذه المنظمة من أجل مساعدة مدينتنا؟
          </label>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          disabled={loading}
          className="bg-primary text-deep-green mt-4 h-12 rounded-lg font-bold shadow-lg shadow-black/20 transition-all hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-50"
          type="submit"
        >
          {loading ? 'جاري الإرسال...' : 'تأكيد الانضمام'}
        </button>
      </form>
    </div>
  );
}
