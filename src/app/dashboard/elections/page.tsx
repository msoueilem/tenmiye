'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useMemberAuth } from '@/context/MemberAuthContext';
import {
  getAllElections,
  getMyVotedElectionIds,
  createElectionApi,
  advanceElectionApi,
} from '@/features/elections/api.client';
import type { Election, BackendElectionType, BackendElectionStatus } from '@/types/elections';

function typeLabel(type: BackendElectionType): string {
  if (type === 'yes_no') return 'استفتاء نعم / لا';
  if (type === 'multiple_choice') return 'اختيار متعدد';
  return 'انتخابات مجلس';
}

function statusLabel(status: BackendElectionStatus): string {
  if (status === 'draft') return 'مسودة';
  if (status === 'nomination') return 'مرحلة الترشيح';
  if (status === 'dismissal') return 'مرحلة الإقصاء';
  if (status === 'voting') return 'جاري التصويت';
  if (status === 'completed') return 'منتهي';
  return 'ملغي';
}

function statusColor(status: BackendElectionStatus): string {
  if (status === 'voting') return 'bg-[#0df20d]/15 text-[#0df20d]';
  if (status === 'draft') return 'bg-amber-400/15 text-amber-400';
  if (status === 'nomination' || status === 'dismissal') return 'bg-blue-400/15 text-blue-400';
  if (status === 'completed') return 'bg-slate-500/20 text-slate-400';
  return 'bg-red-400/15 text-red-400';
}

function nextAdvanceStatus(
  status: BackendElectionStatus,
  type: BackendElectionType,
): 'nomination' | 'dismissal' | 'voting' | 'completed' | null {
  if (status === 'draft') return type === 'board' ? 'nomination' : 'voting';
  if (status === 'nomination') return 'dismissal';
  if (status === 'dismissal') return 'voting';
  if (status === 'voting') return 'completed';
  return null;
}

function nextAdvanceLabel(status: BackendElectionStatus, type: BackendElectionType): string {
  if (status === 'draft') return type === 'board' ? 'بدء الترشيح' : 'بدء التصويت';
  if (status === 'nomination') return 'الانتقال للإقصاء';
  if (status === 'dismissal') return 'بدء التصويت';
  if (status === 'voting') return 'إنهاء';
  return '';
}

function BallotIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

interface ElectionRow extends Election {
  hasVoted?: boolean;
}

interface CreateForm {
  title: string;
  description: string;
  type: BackendElectionType;
  multiOptions: string[];
  seatsCount: string;
  startTime: string;
  endTime: string;
}

const emptyForm = (): CreateForm => ({
  title: '',
  description: '',
  type: 'yes_no',
  multiOptions: ['', ''],
  seatsCount: '3',
  startTime: '',
  endTime: '',
});

export default function DashboardElectionsPage() {
  const { user, getAccessToken } = useMemberAuth();
  const canManage = user?.permissions.includes('MANAGE_ELECTIONS') ?? false;

  const [elections, setElections] = useState<ElectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateForm>(emptyForm());
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const [acting, setActing] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let mounted = true;
    async function load() {
      const token = await getAccessToken();
      const [all, votedIds] = await Promise.all([
        getAllElections(),
        token ? getMyVotedElectionIds(token) : Promise.resolve(new Set<string>()),
      ]);

      if (!mounted) return;
      if (all === null) { setError('تعذّر تحميل الانتخابات.'); setLoading(false); return; }

      const visible = canManage
        ? all
        : all.filter((e) => e.status === 'voting' || e.status === 'completed');

      setElections(visible.map((e) => ({ ...e, hasVoted: votedIds.has(e.id) })));
      setLoading(false);
    }
    void load().catch(() => { if (mounted) { setError('تعذّر تحميل الانتخابات.'); setLoading(false); } });
    return () => { mounted = false; };
  }, [getAccessToken, canManage]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError('');

    type Payload = Parameters<typeof createElectionApi>[0];
    const payload: Payload = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      type: form.type,
    };

    if (form.startTime) payload.startTime = new Date(form.startTime).toISOString();
    if (form.endTime) payload.endTime = new Date(form.endTime).toISOString();

    if (form.type === 'yes_no') {
      payload.options = [
        { id: 'yes', label: 'نعم' },
        { id: 'no', label: 'لا' },
      ];
    } else if (form.type === 'multiple_choice') {
      const labels = form.multiOptions.map((o) => o.trim()).filter(Boolean);
      if (labels.length < 2) {
        setCreateError('أدخل خيارين على الأقل');
        setCreating(false);
        return;
      }
      payload.options = labels.map((label, i) => ({ id: `opt-${i + 1}`, label }));
    } else {
      const seats = parseInt(form.seatsCount, 10);
      if (isNaN(seats) || seats < 1) {
        setCreateError('عدد المقاعد يجب أن يكون رقماً صحيحاً موجباً');
        setCreating(false);
        return;
      }
      payload.boardConfig = { seatsCount: seats };
    }

    const result = await createElectionApi(payload);
    if (!result) {
      setCreateError('فشل إنشاء الانتخابات');
      setCreating(false);
      return;
    }

    const newElection: ElectionRow = {
      id: result.id,
      title: payload.title,
      description: payload.description,
      type: payload.type,
      status: 'draft',
      options: payload.options,
      boardConfig: payload.boardConfig,
      createdAt: new Date().toISOString(),
      hasVoted: false,
    };
    setElections((prev) => [newElection, ...prev]);
    setShowCreate(false);
    setForm(emptyForm());
    setCreating(false);
  }

  async function handleAdvance(election: ElectionRow, targetStatus: 'nomination' | 'dismissal' | 'voting' | 'completed') {
    setActing((prev) => ({ ...prev, [election.id]: true }));
    const result = await advanceElectionApi(election.id, targetStatus);
    if (result.ok) {
      setElections((prev) => prev.map((e) => e.id === election.id ? { ...e, status: targetStatus } : e));
    }
    setActing((prev) => ({ ...prev, [election.id]: false }));
  }

  async function handleCancel(election: ElectionRow) {
    setActing((prev) => ({ ...prev, [`${election.id}_cancel`]: true }));
    const result = await advanceElectionApi(election.id, 'cancelled');
    if (result.ok) {
      setElections((prev) => prev.map((e) => e.id === election.id ? { ...e, status: 'cancelled' } : e));
    }
    setActing((prev) => ({ ...prev, [`${election.id}_cancel`]: false }));
  }

  function setOption(index: number, value: string) {
    setForm((p) => {
      const next = [...p.multiOptions];
      next[index] = value;
      return { ...p, multiOptions: next };
    });
  }

  function addOption() {
    setForm((p) => ({ ...p, multiOptions: [...p.multiOptions, ''] }));
  }

  function removeOption(index: number) {
    setForm((p) => ({ ...p, multiOptions: p.multiOptions.filter((_, i) => i !== index) }));
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 h-8 w-32 animate-pulse rounded-lg bg-white/10" />
        <ul className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <li key={i} className="flex items-start gap-4 rounded-xl border border-white/10 bg-[#071a07] p-5">
              <div className="mt-0.5 h-8 w-8 shrink-0 animate-pulse rounded-full bg-white/10" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 animate-pulse rounded bg-white/10" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-white/5" />
              </div>
              <div className="h-8 w-16 shrink-0 animate-pulse rounded-lg bg-white/10" />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">الانتخابات</h1>
          {canManage && (
            <button
              onClick={() => { setShowCreate(true); setCreateError(''); setForm(emptyForm()); }}
              className="cursor-pointer rounded-xl bg-[#0df20d] px-4 py-2 text-sm font-bold text-slate-900 hover:opacity-90"
            >
              + انتخابات جديدة
            </button>
          )}
        </div>

        {error && <p className="mb-4 text-red-400">{error}</p>}

        {!error && elections.length === 0 && (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-[#071a07] px-8 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/5 text-slate-500">
              <BallotIcon />
            </div>
            <p className="text-slate-400">لا توجد عمليات تصويت متاحة حالياً.</p>
          </div>
        )}

        <ul className="flex flex-col gap-3">
          {elections.map((e) => {
            const advance = nextAdvanceStatus(e.status, e.type);
            const advanceLabel = advance ? nextAdvanceLabel(e.status, e.type) : '';
            const isActing = acting[e.id] ?? false;
            const isCancelling = acting[`${e.id}_cancel`] ?? false;
            const canVote = e.status === 'voting' && !e.hasVoted;

            return (
              <li key={e.id} className="rounded-xl border border-white/10 bg-[#071a07] p-5">
                <div className="flex items-start gap-4">
                  <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    e.status === 'voting' ? 'bg-[#0df20d]/15 text-[#0df20d]' : 'bg-white/5 text-slate-500'
                  }`}>
                    <BallotIcon />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <p className="font-semibold leading-snug text-white">{e.title}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusColor(e.status)}`}>
                        {statusLabel(e.status)}
                      </span>
                      {e.hasVoted && (
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                          صوّتَ
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">{typeLabel(e.type)}</p>
                    {e.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-slate-400">{e.description}</p>
                    )}

                    {canManage && e.status !== 'completed' && e.status !== 'cancelled' && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {advance && (
                          <button
                            disabled={isActing || isCancelling}
                            onClick={() => void handleAdvance(e, advance)}
                            className="cursor-pointer rounded-lg bg-[#0df20d]/15 px-3 py-1 text-xs font-bold text-[#0df20d] hover:bg-[#0df20d]/25 disabled:opacity-50"
                          >
                            {isActing ? '...' : advanceLabel}
                          </button>
                        )}
                        <button
                          disabled={isActing || isCancelling}
                          onClick={() => void handleCancel(e)}
                          className="cursor-pointer rounded-lg bg-red-400/10 px-3 py-1 text-xs font-bold text-red-400 hover:bg-red-400/20 disabled:opacity-50"
                        >
                          {isCancelling ? '...' : 'إلغاء'}
                        </button>
                      </div>
                    )}
                  </div>

                  {(e.status === 'voting' || e.status === 'completed') && (
                    <Link
                      href={`/elections/${e.id}`}
                      className={`shrink-0 cursor-pointer rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
                        canVote
                          ? 'bg-[#0df20d] text-slate-900 hover:bg-[#0be00b]'
                          : 'bg-white/5 text-slate-400 hover:bg-white/10'
                      }`}
                    >
                      {canVote ? 'تصويت' : 'عرض'}
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setShowCreate(false); }}
        >
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0a1f0a] p-6 shadow-2xl" dir="rtl">
            <h2 className="mb-5 text-lg font-bold text-white">إنشاء انتخابات جديدة</h2>
            <form onSubmit={(e) => void handleCreate(e)} className="flex flex-col gap-4">
              <input
                className="w-full rounded-xl border border-white/10 bg-[#071a07] px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-[#0df20d]/40"
                placeholder="عنوان الانتخابات *"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                required
              />
              <textarea
                className="w-full rounded-xl border border-white/10 bg-[#071a07] px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-[#0df20d]/40"
                placeholder="الوصف (اختياري)"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                rows={2}
              />
              <select
                className="w-full rounded-xl border border-white/10 bg-[#071a07] px-3 py-2.5 text-sm text-white outline-none focus:border-[#0df20d]/40"
                value={form.type}
                onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as BackendElectionType }))}
              >
                <option value="yes_no">استفتاء نعم / لا</option>
                <option value="multiple_choice">اختيار متعدد</option>
                <option value="board">انتخابات مجلس الإدارة</option>
              </select>

              {form.type === 'multiple_choice' && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-slate-400">الخيارات (2 على الأقل) *</p>
                  {form.multiOptions.map((opt, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        className="flex-1 rounded-xl border border-white/10 bg-[#071a07] px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-[#0df20d]/40"
                        placeholder={`الخيار ${i + 1}`}
                        value={opt}
                        onChange={(e) => setOption(i, e.target.value)}
                      />
                      {form.multiOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOption(i)}
                          className="cursor-pointer rounded-xl border border-white/10 px-3 text-slate-500 hover:text-red-400"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addOption}
                    className="cursor-pointer self-start rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                  >
                    + إضافة خيار
                  </button>
                </div>
              )}

              {form.type === 'board' && (
                <div>
                  <label className="mb-1 block text-xs text-slate-400">عدد المقاعد *</label>
                  <input
                    type="number"
                    min="1"
                    className="w-full rounded-xl border border-white/10 bg-[#071a07] px-3 py-2.5 text-sm text-white outline-none focus:border-[#0df20d]/40"
                    value={form.seatsCount}
                    onChange={(e) => setForm((p) => ({ ...p, seatsCount: e.target.value }))}
                    required
                  />
                </div>
              )}

              {form.type !== 'board' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-slate-400">بداية التصويت (اختياري)</label>
                    <input
                      type="datetime-local"
                      className="w-full rounded-xl border border-white/10 bg-[#071a07] px-3 py-2.5 text-sm text-white outline-none focus:border-[#0df20d]/40"
                      value={form.startTime}
                      onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-400">نهاية التصويت (اختياري)</label>
                    <input
                      type="datetime-local"
                      className="w-full rounded-xl border border-white/10 bg-[#071a07] px-3 py-2.5 text-sm text-white outline-none focus:border-[#0df20d]/40"
                      value={form.endTime}
                      onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))}
                    />
                  </div>
                </div>
              )}

              {createError && (
                <p className="rounded-lg bg-red-400/10 px-3 py-2 text-sm text-red-400">{createError}</p>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 cursor-pointer rounded-xl bg-[#0df20d] py-2.5 text-sm font-bold text-slate-900 hover:opacity-90 disabled:opacity-50"
                >
                  {creating ? 'جاري الإنشاء...' : 'إنشاء'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 cursor-pointer rounded-xl border border-white/10 py-2.5 text-sm font-bold text-slate-400 hover:text-white"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
