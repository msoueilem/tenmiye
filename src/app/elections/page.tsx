'use client';

import React, { useState, useEffect } from 'react';
import { Election, getAllElections } from '@/lib/firebase/queries';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export default function PublicElectionsPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const data = await getAllElections();
      // Filter out drafts for public view
      setElections(data.filter(e => e.status !== 'draft'));
      setLoading(false);
    }
    fetch();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fcf8] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#0df20d] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fcf8] dark:bg-[#102210] flex flex-col" dir="rtl">
      <Header />
      
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-12">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-4">مركز التصويت المجتمعي</h1>
          <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">صوتك أمانة ومشاركتك هي حجر الزاوية في بناء مستقبل مجموعتنا. استعرض العمليات الانتخابية الجارية وشاركنا قرارك.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {elections.map((e) => (
            <div key={e.id} className="group relative bg-white dark:bg-[#1a331a] rounded-3xl border border-slate-100 dark:border-slate-800 p-8 shadow-xl shadow-slate-200/20 hover:shadow-2xl hover:shadow-[#0df20d]/10 transition-all border-b-4 border-b-slate-200 hover:border-b-[#0df20d]">
              <div className="flex justify-between items-start mb-6">
                <div className={`px-4 py-1.5 rounded-full text-xs font-black border ${
                  e.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  {e.status === 'active' ? '● تصويت جاري الآن' : 'انتهى التصويت'}
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {e.type === 'choice' ? 'اختيار واحد' : e.type === 'yes-no' ? 'استفتاء' : 'نظام الترشيحات'}
                </span>
              </div>
              
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3 group-hover:text-[#0df20d] transition-colors">{e.title}</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-8 line-clamp-3">{e.description}</p>
              
              <Link 
                href={`/elections/${e.id}`}
                className={`w-full h-14 flex items-center justify-center rounded-2xl font-black text-lg transition-all ${
                  e.status === 'active' 
                  ? 'bg-[#0df20d] text-slate-900 hover:bg-[#0be00b] shadow-lg shadow-[#0df20d]/30' 
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {e.status === 'active' ? 'دخول قاعة التصويت' : 'عرض النتائج'}
              </Link>
            </div>
          ))}
          
          {elections.length === 0 && (
            <div className="col-span-full py-20 text-center bg-white dark:bg-[#1a331a] rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
              <span className="material-symbols-outlined text-6xl text-slate-200 dark:text-slate-700 mb-4 block">how_to_vote</span>
              <p className="text-slate-500">لا توجد عمليات تصويت متاحة حالياً.</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
