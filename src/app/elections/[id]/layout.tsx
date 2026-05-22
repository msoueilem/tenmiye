import { MemberAuthProvider } from '@/context/MemberAuthContext';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import Link from 'next/link';

export default function ElectionLayout({ children }: { children: React.ReactNode }) {
  return (
    <MemberAuthProvider>
      <div className="min-h-screen bg-[#f8fcf8] dark:bg-[#102210] flex flex-col" dir="rtl">
        <Header />

        {/* Election context banner */}
        <div className="bg-white dark:bg-[#1a331a] border-b border-slate-100 dark:border-slate-800">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-2 text-sm">
            <Link href="/elections" className="text-slate-400 hover:text-[#0df20d] transition-colors flex items-center gap-1">
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 3H6c-1.1 0-2 .9-2 2v4c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 6H6V5h12v4zM6 13h8v2H6zm0 4h8v2H6zm10 0h2v2h-2zm0-4h2v2h-2z"/>
              </svg>
              مركز التصويت
            </Link>
            <span className="text-slate-300 dark:text-slate-600">›</span>
            <span className="text-slate-600 dark:text-slate-300 font-medium">الانتخابات</span>
          </div>
        </div>

        <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
          {children}
        </main>
        <Footer />
      </div>
    </MemberAuthProvider>
  );
}
