import type { Metadata } from 'next';
import { Noto_Sans_Arabic, Lexend, Public_Sans } from 'next/font/google';
import './globals.css'; // Global styles

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

export const metadata: Metadata = {
  title: 'مجموعة الإرادة لتنمية الغدية',
  description: 'الصفحة الرئيسية لمجموعة الإرادة لتنمية الغدية',
  icons: {
    icon: '/assets/images/favicon.png',
  },
};

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
    >
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="bg-background-light dark:bg-background-dark font-display overflow-x-hidden text-slate-900 dark:text-slate-100"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
