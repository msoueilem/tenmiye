import React from 'react';

export function Header() {
  return (
    <header className="bg-background-light/95 dark:bg-background-dark/95 sticky top-0 z-50 flex items-center justify-between border-b border-solid border-slate-200 px-10 py-4 whitespace-nowrap shadow-sm backdrop-blur-sm dark:border-slate-800">
      <div className="flex items-center gap-4 text-slate-900 dark:text-slate-100">
        <div className="bg-deep-green flex size-10 items-center justify-center overflow-hidden rounded-lg">
          <img
            src="/assets/images/logo.png"
            alt="مجموعة الإرادة"
            className="h-full w-full object-cover"
          />
        </div>
        <h2 className="hidden text-lg leading-tight font-bold tracking-[-0.015em] text-slate-900 sm:block dark:text-slate-100">
          مجموعة الإرادة لتنمية الغدية
        </h2>
      </div>
      <div className="flex flex-1 justify-end gap-8">
        <nav className="hidden items-center gap-9 md:flex">
          <a
            className="hover:text-primary dark:hover:text-primary text-sm leading-normal font-medium text-slate-700 transition-colors dark:text-slate-300"
            href="#"
          >
            الرئيسية
          </a>
          <a
            className="hover:text-primary dark:hover:text-primary text-sm leading-normal font-medium text-slate-700 transition-colors dark:text-slate-300"
            href="#about-us"
          >
            عن المجموعة
          </a>
          <a
            className="hover:text-primary dark:hover:text-primary text-sm leading-normal font-medium text-slate-700 transition-colors dark:text-slate-300"
            href="#initiatives"
          >
            المبادرات
          </a>
          <a
            className="hover:text-primary dark:hover:text-primary text-sm leading-normal font-medium text-slate-700 transition-colors dark:text-slate-300"
            href="#hierarchy"
          >
            الهيكل التنظيمي
          </a>
          <a
            className="hover:text-primary dark:hover:text-primary text-sm leading-normal font-medium text-slate-700 transition-colors dark:text-slate-300"
            href="#join-us"
          >
            انضم إلينا
          </a>
        </nav>
      </div>
    </header>
  );
}
