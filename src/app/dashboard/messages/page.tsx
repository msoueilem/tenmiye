'use client';

import { useEffect, useState, useCallback } from 'react';
import { useMemberAuth } from '@/context/MemberAuthContext';
import { memberFetch } from '@/lib/memberApi';

interface Message {
  id: string;
  name: string;
  body: string;
  email?: string;
  phone?: string;
  read: boolean;
  createdAt?: { seconds: number } | string | null;
}

type FilterStatus = 'all' | 'unread' | 'read';

function formatDate(createdAt: Message['createdAt']): string {
  if (!createdAt) return '—';
  if (typeof createdAt === 'object' && 'seconds' in createdAt) {
    return new Date(createdAt.seconds * 1000).toLocaleDateString('ar-MR', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  }
  if (typeof createdAt === 'string') {
    return new Date(createdAt).toLocaleDateString('ar-MR', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  }
  return '—';
}

export default function MessagesPage() {
  const { getAccessToken } = useMemberAuth();
  const [rows, setRows] = useState<Message[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [marking, setMarking] = useState<Record<string, boolean>>({});

  const fetchPage = useCallback(async (cursor?: string) => {
    const token = await getAccessToken();
    if (!token) { setError('انتهت الجلسة.'); return; }

    const params = new URLSearchParams({ limit: '30' });
    if (cursor) params.set('cursor', cursor);

    const res = await memberFetch(`/messages?${params}`, token);
    if (res.status === 403) { setError('ليس لديك صلاحية الوصول لهذه الصفحة.'); return; }
    if (!res.ok) { setError('تعذّر تحميل الرسائل.'); return; }

    return res.json() as Promise<{ data: Message[]; nextCursor: string | null }>;
  }, [getAccessToken]);

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
    const token = await getAccessToken();
    if (!token) { setMarking((prev) => ({ ...prev, [id]: false })); return; }

    const res = await memberFetch(`/messages/${id}/read`, token, { method: 'PATCH' });
    if (res.ok) {
      setRows((prev) => prev.map((m) => m.id === id ? { ...m, read: true } : m));
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
      <div className="flex h-48 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0df20d] border-t-transparent" />
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
            className={`rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${
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
                  className="shrink-0 rounded-lg bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-400 transition-colors hover:bg-white/10 disabled:opacity-50"
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
            className="rounded-lg bg-white/5 px-6 py-2.5 text-sm font-bold text-slate-300 transition-colors hover:bg-white/10 disabled:opacity-50"
          >
            {loadingMore ? 'جاري التحميل...' : 'تحميل المزيد'}
          </button>
        </div>
      )}
    </div>
  );
}
