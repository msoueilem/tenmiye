'use client';

import React, { use } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export default function ElectionPortal({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  
  React.useEffect(() => {
    // Redirect to the modular vote page
    if (resolvedParams.id) {
      router.replace(`/elections/${resolvedParams.id}/vote`);
    }
  }, [resolvedParams.id, router]);

  return (
    <div className="min-h-screen bg-[#f8fcf8] dark:bg-[#102210] flex flex-col" dir="rtl">
      <Header title="جاري التحويل..." logoUrl="" />
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#0df20d] border-t-transparent rounded-full animate-spin"></div>
      </main>
      <Footer title="مجموعة الإرادة لتنمية الغدية" logoUrl="" />
    </div>
  );
}