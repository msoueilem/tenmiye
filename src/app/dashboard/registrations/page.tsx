'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiFetch, ApiError } from '@/lib/api';

interface Registration {
  id: string;
  fullName: string;
  phone: string;
  city?: string;
  message?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt?: string | null;
}

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected';

function formatDate(createdAt: Registration['createdAt']): string {
  if (!createdAt) return '—';
  return new Date(createdAt).toLocaleDateString('ar-MR', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

function statusBadge(status: Registration['status']) {
  if (status === 'pending') return <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-xs font-bold text-amber-400">معلّق</span>;
  if (status === 'approved') return <span className="rounded-full bg-[#0df20d]/15 px-2 py-0.5 text-xs font-bold text-[#0df20d]">مقبول</span>;
  return <span className="rounded-full bg-red-400/15 px-2 py-0.5 text-xs font-bold text-red-400">مرفوض</span>;
}

export default function RegistrationsPage() {
  const [rows, setRows] = useState<Registration[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [acting, setActing] = useState<Record<string, boolean>>({});

  const fetchPage = useCallback(async (cursor?: string) => {
    const params = new URLSearchParams({ limit: '30' });
    if (cursor) params.set('cursor', cursor);

    try {
      return await apiFetch<{ data: Registration[]; nextCursor: string | null }>(
        'GET',
        `/registrations?${params}`,
        { tokenType: 'member' },
      );
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setError('ليس لديك صلاحية الوصول لهذه الصفحة.');
      } else {
        setError('تعذّر تحميل الطلبات.');
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

  async function updateStatus(id: string, status: 'approved' | 'rejected') {
    setActing((prev) => ({ ...prev, [id]: true }));
    try {
      await apiFetch('PATCH', `/registrations/${id}/status`, {
        body: { status },
        tokenType: 'member',
      });
      setRows((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
    } catch {
      // silently ignore status update failures
    }
    setActing((prev) => ({ ...prev, [id]: false }));
  }

  const FILTERS: { label: string; value: FilterStatus }[] = [
    { label: 'الكل', value: 'all' },
    { label: 'معلّق', value: 'pending' },
    { label: 'مقبول', value: 'approved' },
    { label: 'مرفوض', value: 'rejected' },
  ];

  const visible = filter === 'all' ? rows : rows.filter((r) => r.status === filter);
  const pendingCount = rows.filter((r) => r.status === 'pending').length;

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 h-8 w-48 animate-pulse rounded-lg bg-white/10" />
        <div className="mb-4 flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 w-16 animate-pulse rounded-full bg-white/10" />
          ))}
        </div>
        <ul className="flex flex-col gap-3">
          {[1, 2, 3, 4].map((i) => (
            <li key={i} className="rounded-xl border border-white/10 bg-[#071a07] p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-40 animate-pulse rounded bg-white/10" />
                    <div className="h-5 w-14 animate-pulse rounded-full bg-white/10" />
                  </div>
                  <div className="h-3 w-56 animate-pulse rounded bg-white/5" />
                </div>
                <div className="flex gap-2">
                  <div className="h-8 w-14 animate-pulse rounded-lg bg-white/10" />
                  <div className="h-8 w-14 animate-pulse rounded-lg bg-white/10" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">طلبات الانضمام</h1>
          {pendingCount > 0 && (
            <p className="mt-1 text-sm text-amber-400">{pendingCount} طلب بانتظار المراجعة</p>
          )}
        </div>
      </div>

      {error && <p className="mb-4 text-red-400">{error}</p>}

      {/* Filter tabs */}
      <div className="mb-4 flex gap-2 flex-wrap">
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
            {f.value === 'pending' && pendingCount > 0 && (
              <span className="mr-1.5 rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] text-slate-900">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {visible.length === 0 && !error && (
        <div className="rounded-2xl border border-white/10 bg-[#071a07] px-8 py-16 text-center">
          <p className="text-slate-400">لا توجد طلبات.</p>
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {visible.map((r) => (
          <li
            key={r.id}
            className="rounded-xl border border-white/10 bg-[#071a07] p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="font-semibold text-white">{r.fullName}</p>
                  {statusBadge(r.status)}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-slate-400">
                  <span dir="ltr">+222 {r.phone}</span>
                  {r.city && <span>{r.city}</span>}
                  <span className="text-xs text-slate-600">{formatDate(r.createdAt)}</span>
                </div>
                {r.message && (
                  <p className="mt-2 text-sm text-slate-400 rounded-lg bg-white/5 px-3 py-2">
                    {r.message}
                  </p>
                )}
              </div>

              {r.status === 'pending' && (
                <div className="flex shrink-0 gap-2">
                  <button
                    disabled={acting[r.id]}
                    onClick={() => void updateStatus(r.id, 'approved')}
                    className="cursor-pointer rounded-lg bg-[#0df20d]/15 px-3 py-1.5 text-sm font-bold text-[#0df20d] transition-colors hover:bg-[#0df20d]/25 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    قبول
                  </button>
                  <button
                    disabled={acting[r.id]}
                    onClick={() => void updateStatus(r.id, 'rejected')}
                    className="cursor-pointer rounded-lg bg-red-400/10 px-3 py-1.5 text-sm font-bold text-red-400 transition-colors hover:bg-red-400/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    رفض
                  </button>
                </div>
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
