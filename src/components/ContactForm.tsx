'use client';

import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';

export function ContactForm() {
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
      name: formData.get('name'),
      email: formData.get('email'),
      whatsapp: formData.get('whatsapp'),
      message: formData.get('message'),
      createdAt: serverTimestamp(),
    };

    try {
      await addDoc(collection(db, 'messages-simple'), data);
      setSuccess(true);
      e.currentTarget.reset();
    } catch (err) {
      console.error('Error saving contact message:', err);
      setError('حدث خطأ أثناء إرسال الرسالة. يرجى المحاولة مرة أخرى.');
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
          className="text-primary mt-4 underline transition-colors"
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
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            الاسم الكامل
          </label>
          <input
            name="name"
            required
            className="bg-background-light dark:bg-background-dark focus:ring-primary/50 h-12 w-full rounded-lg border border-slate-200 px-4 text-slate-900 focus:ring-2 focus:outline-none dark:border-slate-600 dark:text-white"
            type="text"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            البريد الإلكتروني
          </label>
          <input
            name="email"
            required
            className="bg-background-light dark:bg-background-dark focus:ring-primary/50 h-12 w-full rounded-lg border border-slate-200 px-4 text-slate-900 focus:ring-2 focus:outline-none dark:border-slate-600 dark:text-white"
            type="email"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            رقم الواتساب
          </label>
          <input
            name="whatsapp"
            required
            className="bg-background-light dark:bg-background-dark focus:ring-primary/50 h-12 w-full rounded-lg border border-slate-200 px-4 text-slate-900 focus:ring-2 focus:outline-none dark:border-slate-600 dark:text-white"
            dir="ltr"
            placeholder="+222..."
            type="tel"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            الرسالة
          </label>
          <textarea
            name="message"
            required
            className="bg-background-light dark:bg-background-dark focus:ring-primary/50 w-full resize-none rounded-lg border border-slate-200 p-4 text-slate-900 focus:ring-2 focus:outline-none dark:border-slate-600 dark:text-white"
            rows={4}
          ></textarea>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          disabled={loading}
          className="border-primary text-deep-green hover:bg-primary mt-2 h-12 rounded-lg border bg-white font-bold transition-all hover:text-white disabled:opacity-50"
          type="submit"
        >
          {loading ? 'جاري الإرسال...' : 'إرسال الرسالة'}
        </button>
      </form>
    </div>
  );
}
