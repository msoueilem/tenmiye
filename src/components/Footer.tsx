import React from 'react';

interface FooterProps {
  title?: string;
  logoUrl?: string;
}

export function Footer({ title, logoUrl }: FooterProps) {
  return (
    <footer className="border-t border-slate-200 bg-white px-10 py-12 dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto flex max-w-[1280px] flex-col items-center justify-between gap-6 md:flex-row">
        <div className="flex items-center gap-3">
          <div className="bg-deep-green flex size-8 items-center justify-center overflow-hidden rounded">
            <img
              src={logoUrl || "/assets/images/logo.png"}
              alt={title || "مجموعة الإرادة"}
              className="h-full w-full object-cover"
            />
          </div>
          <span className="font-bold text-slate-900 dark:text-white">
            {title || "مجموعة الإرادة"}
          </span>
        </div>
        <div className="text-center text-sm text-slate-500 dark:text-slate-400">
          © {new Date().getFullYear()} {title || "مجموعة الإرادة لتنمية الغدية"}. جميع الحقوق
          محفوظة.
        </div>
        <div className="flex gap-4">
          <a
            className="hover:text-primary text-slate-400 transition-colors"
            href="#"
          >
            <span className="material-symbols-outlined">public</span>
          </a>
          <a
            className="hover:text-primary text-slate-400 transition-colors"
            href="#"
          >
            <span className="material-symbols-outlined">share</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
