'use client';

import { useEffect, useState } from 'react';
import type { Announcement } from '@/types/announcements';
import { getActiveAnnouncements } from '@/features/announcements/api.client';

const typeStyles: Record<string, string> = {
  info: 'bg-blue-900/80 border-blue-500 text-blue-100',
  warning: 'bg-amber-900/80 border-amber-500 text-amber-100',
  event: 'bg-green-900/80 border-green-500 text-green-100',
};

export function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    getActiveAnnouncements()
      .then(setAnnouncements)
      .catch(() => {});
  }, []);

  const visible = announcements.filter(
    (a) => !dismissed.has(a.id) && new Date(a.endDate) > new Date(),
  );

  if (visible.length === 0) return null;

  return (
    <div className="sticky top-0 z-50 w-full space-y-1" dir="rtl">
      {visible.map((a) => (
        <div
          key={a.id}
          className={`flex items-center justify-between px-4 py-2 border-b text-sm font-medium ${typeStyles[a.type] ?? typeStyles.info}`}
        >
          <span className="flex-1">{a.message}</span>
          <div className="flex items-center gap-3 mr-4">
            {a.ctaLabel && a.ctaUrl && (
              <a
                href={a.ctaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:opacity-80"
              >
                {a.ctaLabel}
              </a>
            )}
            <button
              onClick={() => setDismissed((prev) => new Set([...prev, a.id]))}
              aria-label="إغلاق"
              className="opacity-70 hover:opacity-100 text-lg leading-none"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
