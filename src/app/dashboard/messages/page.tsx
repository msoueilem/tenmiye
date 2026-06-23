'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiFetch, ApiError } from '@/lib/api';

interface Message {
  id: string;
  name: string;
  body: string;
  email?: string;
  phone?: string;
  read: boolean;
  createdAt?: string | null;
}

type FilterStatus = 'all' | 'unread' | 'read';

function formatDate(createdAt: Message['createdAt']): string {
  if (!createdAt) return '—';
  return new Date(createdAt).toLocaleDateString('ar-MR', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

export default function MessagesPage() {
  const [rows, setRows] = useState<Message[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [marking, setMarking] = useState<Record<string, boolean>>({});

  const fetchPage = useCallback(async (cursor?: string) => {
    const params = new URLSearchParams({ limit: '30' });
    if (cursor) params.set('cursor', cursor);

    try {
      return await apiFetch<{ data: Message[]; nextCursor: string | null }>(
        'GET',
        `/messages?${params}`,
        { tokenType: 'member' },
      );
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setError('ليس لديك صلاحية الوصول لهذه الصفحة.');
      } else {
        setError('تعذّر تحميل الرسائل.');
      }
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const result = await fetchPage();
      if (!mounted) return;
      if (result) { setRows(result.data); setNextCursor(result.nextCursor); }
      setLoading(false);
    }
    void load();
    return () => { mounted = false; };
  }, [fetchPage]);

  async function loadMore() {
    if (!nextCursor) return;
    setLoadingMore(true);
    const result = await fetchPage(nextCursor);
    if (result) {
      setRows((prev) => [...prev, ...result.data]);
      setNextCursor(result.nextCursor);
    }
    setLoadingMore(false);
  }

  async function markRead(id: string) {
    setMarking((prev) => ({ ...prev, [id]: true }));
    setError('');
    try {
      await apiFetch(`PATCH`, `/messages/${id}/read`, { tokenType: 'member' });
      setRows((prev) => prev.map((m) => m.id === id ? { ...m, read: true } : m));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'تعذّر تحديث الرسالة.');
    }
    setMarking((prev) => ({ ...prev, [id]: false }));
  }

  const FILTERS: { label: string; value: FilterStatus }[] = [
    { label: 'الكل', value: 'all' },
    { label: 'غير مقروء', value: 'unread' },
    { label: 'مقروء', value: 'read' },
  ];

  const unreadCount = rows.filter((m) => !m.read).length;
  const visible = filter === 'all' ? rows : rows.filter((m) => filter === 'unread' ? !m.read : m.read);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 h-8 w-40 animate-pulse rounded-lg bg-white/10" />
        <div className="mb-4 flex gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 w-20 animate-pulse rounded-full bg-white/10" />
          ))}
        </div>
        <ul className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <li key={i} className="rounded-xl border border-white/10 bg-[#071a07] p-5">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-32 animate-pulse rounded bg-white/10" />
                  <div className="h-4 w-10 animate-pulse rounded-full bg-white/10" />
                </div>
                <div className="h-3 w-48 animate-pulse rounded bg-white/5" />
                <div className="h-3 w-full animate-pulse rounded bg-white/5" />
                <div className="h-3 w-3/4 animate-pulse rounded bg-white/5" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">رسائل التواصل</h1>
        {unreadCount > 0 && (
          <p className="mt-1 text-sm text-amber-400">{unreadCount} رسالة غير مقروءة</p>
        )}
      </div>

      {error && <p className="mb-4 text-red-400">{error}</p>}

      {/* Filter tabs */}
      <div className="mb-4 flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${
              filter === f.value
                ? 'bg-[#0df20d] text-slate-900'
                : 'bg-white/5 text-slate-400 hover:bg-white/10'
            }`}
          >
            {f.label}
            {f.value === 'unread' && unreadCount > 0 && (
              <span className="mr-1.5 rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] text-slate-900">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {visible.length === 0 && !error && (
        <div className="rounded-2xl border border-white/10 bg-[#071a07] px-8 py-16 text-center">
          <p className="text-slate-400">لا توجد رسائل.</p>
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {visible.map((m) => (
          <li
            key={m.id}
            className={`rounded-xl border bg-[#071a07] p-5 transition-colors ${
              m.read ? 'border-white/10' : 'border-amber-400/30'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="font-semibold text-white">{m.name}</p>
                  {!m.read && (
                    <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                      جديد
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500 mb-3">
                  {m.email && <span>{m.email}</span>}
                  {m.phone && <span dir="ltr">+222 {m.phone}</span>}
                  <span>{formatDate(m.createdAt)}</span>
                </div>

                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{m.body}</p>
              </div>

              {!m.read && (
                <button
                  disabled={marking[m.id]}
                  onClick={() => void markRead(m.id)}
                  className="shrink-0 cursor-pointer rounded-lg bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-400 transition-colors hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {marking[m.id] ? '...' : 'تحديد كمقروء'}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {nextCursor && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => void loadMore()}
            disabled={loadingMore}
            className="cursor-pointer rounded-lg bg-white/5 px-6 py-2.5 text-sm font-bold text-slate-300 transition-colors hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingMore ? 'جاري التحميل...' : 'تحميل المزيد'}
          </button>
        </div>
      )}
    </div>
  );
}
