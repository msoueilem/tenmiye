'use client';

import { useEffect, useState } from 'react';

export function FloatingJoinCta() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const joinSection = document.getElementById('join-us');

    const onScroll = () => {
      const scrolledPastHero = window.scrollY > 600;
      let pastJoinSection = false;

      if (joinSection) {
        const rect = joinSection.getBoundingClientRect();
        pastJoinSection = rect.top < window.innerHeight;
      }

      setVisible(scrolledPastHero && !pastJoinSection);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <a
      href="#join-us"
      className={`fixed bottom-6 left-1/2 z-40 -translate-x-1/2 transition-all duration-300 ${
        visible
          ? 'opacity-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
    >
      <span className="bg-primary text-deep-green flex h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-bold shadow-xl shadow-black/20 transition-transform hover:scale-105">
        <span className="material-symbols-outlined text-lg">group_add</span>
        انضم إلينا الآن
      </span>
    </a>
  );
}
