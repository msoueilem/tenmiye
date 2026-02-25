'use client';

import React, { useRef } from 'react';
import { Initiative } from '@/lib/firebase/queries';

interface InitiativesCarouselProps {
  initiatives: Initiative[];
}

export function InitiativesCarousel({ initiatives }: InitiativesCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'next' | 'prev') => {
    if (scrollRef.current) {
      // In an RTL layout, scrolling "next" (left visually) corresponds to a negative scrollLeft.
      // However, scrollBy handles RTL automatically in many modern browsers,
      // but to be safe, we calculate based on direction.
      const isRTL =
        window.getComputedStyle(scrollRef.current).direction === 'rtl';
      const sign = isRTL ? -1 : 1;
      const scrollAmount = direction === 'next' ? sign * 350 : sign * -350;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const dataToRender =
    initiatives && initiatives.length > 0
      ? initiatives
      : [
          {
            title: 'رواتب معلمي القرآن',
            description:
              'دعم حلقات تحفيظ القرآن الكريم وتوفير رواتب شهرية للمعلمين لضمان استمرارية التعليم.',
            type: 'تعليمي',
            image:
              'https://lh3.googleusercontent.com/aida-public/AB6AXuBKneEU2rq1YaDVPccbze4BVzwXHvZdsEeqrmEke-nMqCPYiKYaB00ImoVwvK_RK9IZloYQgKdOUmIxUetxrAaGdZqA347trLp9W3MNFJpX53ClIe4856U6jgUBw8GVscOicSVGlrc53Oj0dQ36kyuYOMf5ud0MFXEs7nxbeCHIzL3UHCGOgCizr2go_-LX7gkFFOjUurKA2oTleN6tnPhN7IkRsZ57R_tzmbpu6-cvCzJTv4KR_UaJpp-WadL8nTt2UalrxBOLstFA',
          },
          {
            title: 'مشاريع تنموية',
            description:
              'تمويل وإدارة مشاريع تهدف لتطوير البنية التحتية والخدمات العامة في الأحياء المحتاجة.',
            type: 'تنمية',
            image:
              'https://lh3.googleusercontent.com/aida-public/AB6AXuBZYltJ--me2BXZz85vQZDKcfqydShHxdIxp2fBo7----sK30QcHui2_klvBdTUZzPvIcU3wuiaeKovd4ACpB6NDFV4oF5QR0DAkB26BY68bHRltdClYxrh9lvtKbqhNeoHJFBTT6dzcSN7riPTMCqjGTIkSg9lkO1_MLOoIcKT0K2S47be-R7C5i9bPc-OYgrz6k6ei3zr-ZXGYxDA34aa0WcUl81AD-RUsSn0nt6pMn5gcxiPYTqW79VSkEjmgTghrUstyZu2aCfZ',
          },
        ];

  return (
    <div className="flex flex-col gap-10 px-4 py-6" id="initiatives">
      <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
        <div className="flex max-w-[720px] flex-col gap-4">
          <h2 className="tracking-light text-3xl leading-tight font-bold text-slate-900 md:text-4xl dark:text-white">
            مبادراتنا <span className="text-primary">المجتمعية</span>
          </h2>
          <p className="text-lg leading-relaxed font-normal text-slate-600 dark:text-slate-400">
            اسحب أو استخدم الأزرار لاستعراض المبادرات التنموية والخيرية التي
            تهدف إلى الارتقاء بالفرد والمجتمع.
          </p>
        </div>

        {/* Navigation Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => scroll('prev')}
            className="hover:text-primary dark:hover:text-primary flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            aria-label="السابق"
          >
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
          <button
            onClick={() => scroll('next')}
            className="hover:text-primary dark:hover:text-primary flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            aria-label="التالي"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="scrollbar-hide w-full snap-x snap-mandatory overflow-x-auto scroll-smooth pb-6"
      >
        <div className="flex w-max gap-6 px-2">
          {dataToRender.map((initiative: any, idx: number) => (
            <div
              key={idx}
              className="group hover:border-primary flex w-[300px] cursor-pointer snap-center flex-col gap-4 rounded-xl border border-slate-100 bg-white p-4 shadow-md transition-all md:w-[400px] dark:border-slate-700 dark:bg-slate-800"
            >
              <div
                className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-slate-200 bg-cover bg-center dark:bg-slate-700"
                style={{
                  backgroundImage: `url("${initiative.image || `https://picsum.photos/600/400?random=${idx + 3}`}")`,
                }}
              >
                <div className="absolute inset-0 bg-black/20 transition-all group-hover:bg-black/0"></div>
              </div>
              <div className="flex flex-col gap-2">
                {initiative.type && (
                  <div className="flex items-center gap-2">
                    <span className="bg-deep-green/10 text-deep-green dark:text-primary rounded px-2 py-1 text-xs font-bold">
                      {initiative.type}
                    </span>
                  </div>
                )}
                <h3 className="group-hover:text-primary text-xl leading-normal font-bold text-slate-900 transition-colors dark:text-white">
                  {initiative.title}
                </h3>
                {initiative.description && (
                  <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                    {initiative.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
