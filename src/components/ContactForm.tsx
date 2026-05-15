'use client';

import React, { useState } from 'react';
import { config } from '@/lib/config';

const PHONE_RE = /^[234]\d{7}$/;

export function ContactForm() {
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

    if (rawPhone && !PHONE_RE.test(rawPhone)) {
      setPhoneError('رقم الهاتف يجب أن يكون 8 أرقام ويبدأ بـ 2 أو 3 أو 4');
      return;
    }

    const body: Record<string, string> = {
      name: formData.get('name') as string,
      body: formData.get('message') as string,
    };
    const email = formData.get('email') as string;
    if (email) body.email = email;
    if (rawPhone) body.phone = rawPhone;

    setLoading(true);
    try {
      const res = await fetch(`${config.apiUrl}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        const msg = Array.isArray(json.message) ? json.message[0] : json.message;
        setError(msg || 'حدث خطأ أثناء إرسال الرسالة. يرجى المحاولة مرة أخرى.');
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
      <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-2xl border border-slate-100 bg-white p-10 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <span className="material-symbols-outlined text-primary text-6xl">
          check_circle
        </span>
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
          تم إرسال رسالتك!
        </h3>
        <p className="text-slate-600 dark:text-slate-400">
          شكراً لتواصلك معنا. سنقوم بالرد عليك في أقرب وقت ممكن.
        </p>
        <button
          onClick={() => setSuccess(false)}
          className="text-primary mt-4 cursor-pointer underline transition-colors"
        >
          إرسال رسالة أخرى
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 rounded-2xl border border-slate-100 bg-white p-10 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <h3 className="mb-6 text-xl font-bold text-slate-900 dark:text-white">
        أرسل لنا رسالة
      </h3>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="contact-name" className="text-sm font-medium text-slate-700 dark:text-slate-300">
            الاسم الكامل
          </label>
          <input
            id="contact-name"
            name="name"
            required
            className="bg-background-light dark:bg-background-dark focus:ring-primary/50 h-12 w-full rounded-lg border border-slate-200 px-4 text-slate-900 focus:ring-2 focus:outline-none dark:border-slate-600 dark:text-white"
            type="text"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="contact-email" className="text-sm font-medium text-slate-700 dark:text-slate-300">
            البريد الإلكتروني
          </label>
          <input
            id="contact-email"
            name="email"
            className="bg-background-light dark:bg-background-dark focus:ring-primary/50 h-12 w-full rounded-lg border border-slate-200 px-4 text-slate-900 focus:ring-2 focus:outline-none dark:border-slate-600 dark:text-white"
            type="email"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="contact-phone" className="text-sm font-medium text-slate-700 dark:text-slate-300">
            رقم الواتساب (اختياري)
          </label>
          <div className="relative">
            <input
              id="contact-phone"
              name="phone"
              className="bg-background-light dark:bg-background-dark focus:ring-primary/50 h-12 w-full rounded-lg border border-slate-200 px-4 pl-20 text-left text-slate-900 focus:ring-2 focus:outline-none dark:border-slate-600 dark:text-white"
              dir="ltr"
              placeholder="20 12 34 56"
              type="tel"
              maxLength={11}
            />
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center rounded-l-lg border-r border-slate-200 bg-slate-50 px-3 text-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-400">
              +222
            </div>
          </div>
          {phoneError && <p className="text-sm text-red-500">{phoneError}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="contact-message" className="text-sm font-medium text-slate-700 dark:text-slate-300">
            الرسالة
          </label>
          <textarea
            id="contact-message"
            name="message"
            required
            className="bg-background-light dark:bg-background-dark focus:ring-primary/50 w-full resize-none rounded-lg border border-slate-200 p-4 text-slate-900 focus:ring-2 focus:outline-none dark:border-slate-600 dark:text-white"
            rows={4}
          ></textarea>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          disabled={loading}
          className="border-primary text-deep-green hover:bg-primary mt-2 h-12 cursor-pointer rounded-lg border bg-white font-bold transition-all hover:text-white disabled:opacity-50"
          type="submit"
        >
          {loading ? 'جاري الإرسال...' : 'إرسال الرسالة'}
        </button>
      </form>
    </div>
  );
}
