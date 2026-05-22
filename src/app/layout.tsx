import type { Metadata } from 'next';
import { Noto_Sans_Arabic, Lexend, Public_Sans } from 'next/font/google';
import './globals.css'; // Global styles
import { getPublicLandingData } from '@/features/landing/api.client';
import { ThemeProvider } from '@/components/ThemeProvider';

const notoSansArabic = Noto_Sans_Arabic({
  subsets: ['arabic'],
  variable: '--font-noto-sans-arabic',
});

const lexend = Lexend({
  subsets: ['latin'],
  variable: '--font-lexend',
});

const publicSans = Public_Sans({
  subsets: ['latin'],
  variable: '--font-public-sans',
});

export async function generateMetadata(): Promise<Metadata> {
  const data = await getPublicLandingData();
  const title = data?.title || 'مجموعة الإرادة لتنمية الغدية';
  const favicon = data?.faviconUrl || '/assets/images/favicon.png';

  return {
    title,
    description: 'الصفحة الرئيسية لمجموعة الإرادة لتنمية الغدية',
    icons: {
      icon: favicon,
    },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${notoSansArabic.variable} ${lexend.variable} ${publicSans.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
        {/* Prevent flash of wrong theme on load */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()`,
          }}
        />
      </head>
      <body
        className="bg-background-light dark:bg-background-dark font-display overflow-x-hidden text-slate-900 dark:text-slate-100"
        suppressHydrationWarning
      >
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
