'use client';

import { useEffect, useRef, useState } from 'react';

interface CountUpProps {
  end: number;
  duration?: number;
  prefix?: string;
}

export function CountUp({ end, duration = 1500, prefix = '' }: CountUpProps) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLParagraphElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const startTime = performance.now();

          const tick = (now: number) => {
            const progress = Math.min((now - startTime) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(Math.floor(eased * end));
            if (progress < 1) requestAnimationFrame(tick);
            else setValue(end);
          };

          requestAnimationFrame(tick);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [end, duration]);

  return (
    <p
      ref={ref}
      className="tracking-light text-4xl leading-tight font-bold text-slate-900 dark:text-white"
    >
      {prefix}
      {value.toLocaleString()}
    </p>
  );
}
