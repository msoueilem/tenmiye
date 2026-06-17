import React from 'react';

interface Testimonial {
  name: string;
  role: string;
  quote: string;
  avatarUrl?: string;
}

const DEFAULT_TESTIMONIALS: Testimonial[] = [
  {
    name: 'محمد المختار',
    role: 'عضو منذ 2018',
    quote: 'الانضمام لمجموعة الإرادة غيّر نظرتي للعمل التطوعي. رأيت بعيني أثر المبادرات على حياة الناس في حينا.',
  },
  {
    name: 'فاطمة بنت أحمد',
    role: 'متطوعة',
    quote: 'بيئة العمل هنا مليئة بالحماس والجدية. كل مبادرة تُدرس وتُنفذ بعناية كبيرة لخدمة المجتمع.',
  },
  {
    name: 'عبد الله سيدي',
    role: 'عضو لجنة المبادرات',
    quote: 'ما يميز المجموعة هو الشفافية والعمل الجماعي. شعرت أن صوتي مسموع منذ اليوم الأول.',
  },
];

export function TestimonialsSection({ testimonials = DEFAULT_TESTIMONIALS }: { testimonials?: Testimonial[] }) {
  return (
    <div className="flex flex-col gap-10 px-4 py-12" id="testimonials">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="text-primary flex items-center gap-2 font-bold">
          <span className="bg-primary h-[2px] w-8"></span>
          <span>أصوات من المجموعة</span>
          <span className="bg-primary h-[2px] w-8"></span>
        </div>
        <h2 className="text-3xl leading-tight font-bold text-slate-900 md:text-4xl dark:text-white">
          ماذا يقول أعضاؤنا
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {testimonials.map((t, idx) => (
          <div
            key={idx}
            className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-transform hover:-translate-y-1 dark:border-slate-700 dark:bg-slate-800"
          >
            <span className="material-symbols-outlined text-primary text-3xl">format_quote</span>
            <p className="flex-1 text-slate-600 dark:text-slate-300 leading-relaxed">
              {t.quote}
            </p>
            <div className="flex items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-700">
              <div className="bg-deep-green/10 text-deep-green flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold">
                {t.name.charAt(0)}
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-slate-800 dark:text-white text-sm">{t.name}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">{t.role}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
