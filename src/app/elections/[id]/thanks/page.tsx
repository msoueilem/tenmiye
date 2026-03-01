'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';

export default function ElectionThanksPage() {
  const { id } = useParams();
  const router = useRouter();

  React.useEffect(() => {
    if (auth) signOut(auth);
    sessionStorage.removeItem(`voter_session_${id}`);
  }, [id]);

  return (
    <div className="min-h-screen bg-[#f8fcf8] dark:bg-[#102210] flex flex-col" dir="rtl">
      <Header />
      
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg bg-white dark:bg-[#1a331a] rounded-3xl shadow-2xl p-10 text-center border border-slate-100 dark:border-slate-800 animate-in zoom-in duration-300">
          <div className="size-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-5xl">task_alt</span>
          </div>
          
          <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-4">شكراً لمشاركتك!</h1>
          <p className="text-slate-500 mb-8 leading-relaxed">
            تم تسجيل صوتك بنجاح في النظام. مشاركتك تساهم في صنع القرار وبناء مستقبل أفضل لمجموعتنا.
          </p>
          
          <div className="space-y-4">
            <button 
              onClick={() => router.push('/elections')}
              className="w-full h-14 bg-[#0df20d] text-slate-900 rounded-2xl font-black text-lg hover:bg-[#0be00b] transition-all shadow-lg shadow-[#0df20d]/20"
            >
              العودة لقائمة الانتخابات
            </button>
            <p className="text-xs text-slate-400 font-bold">لقد تم تسجيل خروجك تلقائياً للحفاظ على خصوصية صوتك.</p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
