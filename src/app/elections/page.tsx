'use client';

import React, { useState, useEffect } from 'react';
import { Election, BackendElectionType, BackendElectionStatus } from '@/types/elections';
import { getAllElections } from '@/features/elections/api.client';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

function typeLabel(type: BackendElectionType): string {
  if (type === 'yes_no') return 'استفتاء نعم / لا';
  if (type === 'multiple_choice') return 'اختيار متعدد';
  return 'انتخابات مجلس';
}

function statusLabel(status: BackendElectionStatus): string {
  if (status === 'voting') return '● تصويت جاري الآن';
  if (status === 'completed') return 'انتهى التصويت';
  return '';
}

export default function PublicElectionsPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const data = await getAllElections();
      if (mounted) {
        setElections((data ?? []).filter((e) => e.status === 'voting' || e.status === 'completed'));
        setLoading(false);
      }
    }
    void load();
    return () => { mounted = false; };
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
          <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            صوتك أمانة ومشاركتك هي حجر الزاوية في بناء مستقبل مجموعتنا. استعرض العمليات الانتخابية الجارية وشاركنا قرارك.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {elections.map((e) => (
            <div
              key={e.id}
              className="group relative bg-white dark:bg-[#1a331a] rounded-3xl border border-slate-100 dark:border-slate-800 p-8 shadow-xl shadow-slate-200/20 hover:shadow-2xl hover:shadow-[#0df20d]/10 transition-all border-b-4 border-b-slate-200 hover:border-b-[#0df20d]"
            >
              <div className="flex justify-between items-start mb-6">
                <div className={`px-4 py-1.5 rounded-full text-xs font-black border ${
                  e.status === 'voting'
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  {statusLabel(e.status)}
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {typeLabel(e.type)}
                </span>
              </div>

              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3 group-hover:text-[#0df20d] transition-colors">
                {e.title}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-8 line-clamp-3">
                {e.description}
              </p>

              <Link
                href={`/elections/${e.id}`}
                className={`w-full h-14 flex items-center justify-center rounded-2xl font-black text-lg transition-all ${
                  e.status === 'voting'
                    ? 'bg-[#0df20d] text-slate-900 hover:bg-[#0be00b] shadow-lg shadow-[#0df20d]/30'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {e.status === 'voting' ? 'دخول قاعة التصويت' : 'عرض النتائج'}
              </Link>
            </div>
          ))}

          {elections.length === 0 && (
            <div className="col-span-full py-20 text-center bg-white dark:bg-[#1a331a] rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
              <span className="material-symbols-outlined text-6xl text-slate-200 dark:text-slate-700 mb-4 block">
                how_to_vote
              </span>
              <p className="text-slate-500">لا توجد عمليات تصويت متاحة حالياً.</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
