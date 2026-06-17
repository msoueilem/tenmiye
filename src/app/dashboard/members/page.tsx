'use client';

import { useEffect, useState, useCallback } from 'react';
import { useMemberAuth } from '@/context/MemberAuthContext';
import { apiFetch, ApiError } from '@/lib/api';

const LIMIT = 25;
const CAN_MANAGE = 'MANAGE_USERS';

interface Member {
  id: string;
  fullName: string;
  phoneNumber: string;
  whatsappNumber?: string;
  nationalId?: string | null;
  city?: string | null;
  regionId?: string | null;
  status: 'pending' | 'active' | 'inactive' | 'blocked';
  isBlocked: boolean;
  outsideWhatsapp: boolean;
  createdAt?: string | null;
}

interface MemberFormData {
  fullName: string;
  phoneNumber: string;
  whatsappNumber: string;
  nationalId: string;
  city: string;
  regionId: string;
  outsideWhatsapp: boolean;
}

const EMPTY_FORM: MemberFormData = {
  fullName: '',
  phoneNumber: '',
  whatsappNumber: '',
  nationalId: '',
  city: '',
  regionId: '',
  outsideWhatsapp: false,
};

type FilterStatus = 'all' | 'pending' | 'active' | 'blocked';

const STATUS_LABEL: Record<string, string> = { pending: 'معلّق', active: 'نشط', inactive: 'غير نشط', blocked: 'محظور' };

function formatDate(val: Member['createdAt']): string {
  if (!val) return '—';
  return new Date(val).toLocaleDateString('ar-MR', { year: 'numeric', month: 'long', day: 'numeric' });
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'active') return <span className="rounded-full bg-[#0df20d]/15 px-2 py-0.5 text-xs font-bold text-[#0df20d]">نشط</span>;
  if (status === 'pending') return <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-xs font-bold text-amber-400">معلّق</span>;
  if (status === 'inactive') return <span className="rounded-full bg-slate-500/20 px-2 py-0.5 text-xs font-bold text-slate-400">غير نشط</span>;
  return <span className="rounded-full bg-red-400/15 px-2 py-0.5 text-xs font-bold text-red-400">{STATUS_LABEL[status] ?? status}</span>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-slate-400">{label}</label>
      {children}
    </div>
  );
}

const INPUT_CLS = 'w-full rounded-xl border border-white/10 bg-[#071a07] px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-[#0df20d]/40 focus:ring-1 focus:ring-[#0df20d]/20';

export default function MembersPage() {
  const { user } = useMemberAuth();
  const canManage = user?.permissions.includes(CAN_MANAGE) ?? false;

  const [rows, setRows] = useState<Member[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [acting, setActing] = useState<Record<string, boolean>>({});

  // Modal state
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [editing, setEditing] = useState<Member | null>(null);
  const [form, setForm] = useState<MemberFormData>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [formSaving, setFormSaving] = useState(false);

  const fetchPage = useCallback(async (cursor?: string) => {
    const params = new URLSearchParams({ limit: String(LIMIT) });
    if (cursor) params.set('cursor', cursor);
    try {
      return await apiFetch<{ data: Member[]; nextCursor: string | null }>('GET', `/users?${params}`, { tokenType: 'member' });
    } catch (e: unknown) {
      if (e instanceof ApiError && e.status === 403) {
        setError('ليس لديك صلاحية الوصول لهذه الصفحة.');
      } else {
        setError('تعذّر تحميل الأعضاء.');
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

  async function updateStatus(id: string, status: 'active' | 'blocked') {
    setActing((prev) => ({ ...prev, [id]: true }));
    try {
      await apiFetch(`PATCH`, `/users/${id}`, { body: { status }, tokenType: 'member' });
      setRows((prev) => prev.map((m) => m.id === id ? { ...m, status } : m));
    } catch { /* silently ignore — row stays unchanged */ }
    setActing((prev) => ({ ...prev, [id]: false }));
  }

  async function toggleBooleanField(id: string, field: 'isBlocked' | 'outsideWhatsapp', current: boolean) {
    setActing((prev) => ({ ...prev, [`${id}_${field}`]: true }));
    try {
      await apiFetch('PATCH', `/users/${id}`, { body: { [field]: !current }, tokenType: 'member' });
      setRows((prev) => prev.map((m) => m.id === id ? { ...m, [field]: !current } : m));
    } catch { /* silently ignore */ }
    setActing((prev) => ({ ...prev, [`${id}_${field}`]: false }));
  }

  function openAdd() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setModal('add');
  }

  function openEdit(member: Member) {
    setEditing(member);
    setForm({
      fullName: member.fullName ?? '',
      phoneNumber: member.phoneNumber ?? '',
      whatsappNumber: member.whatsappNumber ?? '',
      nationalId: member.nationalId ?? '',
      city: member.city ?? '',
      regionId: member.regionId ?? '',
      outsideWhatsapp: member.outsideWhatsapp,
    });
    setFormError('');
    setModal('edit');
  }

  function closeModal() {
    setModal(null);
    setEditing(null);
    setFormError('');
  }

  function setField(key: keyof MemberFormData, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submitForm() {
    setFormSaving(true);
    setFormError('');

    const body: Record<string, unknown> = {
      fullName: form.fullName,
      phoneNumber: form.phoneNumber,
    };
    if (form.whatsappNumber) body.whatsappNumber = form.whatsappNumber;
    if (form.nationalId) body.nationalId = form.nationalId;
    if (form.city) body.city = form.city;
    if (form.regionId) body.regionId = form.regionId;

    try {
      if (modal === 'add') {
        if (!form.whatsappNumber) { setFormError('رقم واتساب مطلوب.'); setFormSaving(false); return; }
        body.whatsappNumber = form.whatsappNumber;
        const { id } = await apiFetch<{ id: string }>('POST', '/users', { body, tokenType: 'member' });
        const newMember: Member = { id, fullName: form.fullName, phoneNumber: form.phoneNumber, whatsappNumber: form.whatsappNumber, nationalId: form.nationalId || null, city: form.city || null, regionId: form.regionId || null, outsideWhatsapp: form.outsideWhatsapp, isBlocked: false, status: 'pending', createdAt: new Date().toISOString() };
        setRows((prev) => [newMember, ...prev]);
        closeModal();
      } else if (modal === 'edit' && editing) {
        body.outsideWhatsapp = form.outsideWhatsapp;
        await apiFetch('PATCH', `/users/${editing.id}`, { body, tokenType: 'member' });
        setRows((prev) => prev.map((m) => m.id === editing.id ? { ...m, fullName: form.fullName, phoneNumber: form.phoneNumber, whatsappNumber: form.whatsappNumber || m.whatsappNumber, nationalId: form.nationalId || null, city: form.city || null, regionId: form.regionId || null, outsideWhatsapp: form.outsideWhatsapp } : m));
        closeModal();
      }
    } catch (e: unknown) {
      const fallback = modal === 'add' ? 'تعذّر إضافة العضو.' : 'تعذّر تحديث بيانات العضو.';
      setFormError(e instanceof ApiError ? e.message : fallback);
    }
    setFormSaving(false);
  }

  const FILTERS: { label: string; value: FilterStatus }[] = [
    { label: 'الكل', value: 'all' },
    { label: 'معلّق', value: 'pending' },
    { label: 'نشط', value: 'active' },
    { label: 'محظور', value: 'blocked' },
  ];

  const pendingCount = rows.filter((m) => m.status === 'pending').length;
  const visible = filter === 'all' ? rows : rows.filter((m) => m.status === filter);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 h-8 w-40 animate-pulse rounded-lg bg-white/10" />
        <div className="mb-4 flex gap-2">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-8 w-16 animate-pulse rounded-full bg-white/10" />)}
        </div>
        <ul className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <li key={i} className="rounded-xl border border-white/10 bg-[#071a07] p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-40 animate-pulse rounded bg-white/10" />
                    <div className="h-5 w-12 animate-pulse rounded-full bg-white/10" />
                  </div>
                  <div className="h-3 w-56 animate-pulse rounded bg-white/5" />
                </div>
                <div className="h-8 w-16 animate-pulse rounded-lg bg-white/10" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">الأعضاء</h1>
            {pendingCount > 0 && (
              <p className="mt-1 text-sm text-amber-400">{pendingCount} عضو بانتظار الموافقة</p>
            )}
          </div>
          {canManage && (
            <button
              onClick={openAdd}
              className="cursor-pointer rounded-xl bg-[#0df20d] px-4 py-2 text-sm font-bold text-slate-900 transition-opacity hover:opacity-90"
            >
              + إضافة عضو
            </button>
          )}
        </div>

        {error && <p className="mb-4 text-red-400">{error}</p>}

        {/* Filter tabs */}
        <div className="mb-4 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${
                filter === f.value ? 'bg-[#0df20d] text-slate-900' : 'bg-white/5 text-slate-400 hover:bg-white/10'
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
            <p className="text-slate-400">لا يوجد أعضاء.</p>
          </div>
        )}

        <ul className="flex flex-col gap-3">
          {visible.map((m) => (
            <li key={m.id} className="rounded-xl border border-white/10 bg-[#071a07] p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-semibold text-white">{m.fullName}</p>
                    <StatusBadge status={m.status} />
                    {m.isBlocked && (
                      <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-bold text-red-400">محظور</span>
                    )}
                    {m.outsideWhatsapp && (
                      <span className="rounded-full bg-slate-500/20 px-2 py-0.5 text-xs font-bold text-slate-400">خارج واتساب</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-slate-400">
                    <span dir="ltr">{m.phoneNumber}</span>
                    {m.city && <span>{m.city}</span>}
                    {m.regionId && <span>{m.regionId}</span>}
                    <span className="text-xs text-slate-600">{formatDate(m.createdAt)}</span>
                  </div>
                </div>

                {canManage && (
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      onClick={() => openEdit(m)}
                      className="cursor-pointer rounded-lg bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-400 transition-colors hover:bg-white/10"
                    >
                      تعديل
                    </button>
                    <button
                      disabled={!!acting[`${m.id}_outsideWhatsapp`]}
                      onClick={() => void toggleBooleanField(m.id, 'outsideWhatsapp', m.outsideWhatsapp)}
                      className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                        m.outsideWhatsapp
                          ? 'bg-slate-500/15 text-slate-300 hover:bg-slate-500/25'
                          : 'bg-white/5 text-slate-400 hover:bg-white/10'
                      }`}
                    >
                      {acting[`${m.id}_outsideWhatsapp`] ? '...' : m.outsideWhatsapp ? 'في واتساب' : 'خارج واتساب'}
                    </button>
                    {(m.status === 'pending' || m.status === 'blocked') && (
                      <button
                        disabled={!!acting[m.id]}
                        onClick={() => void updateStatus(m.id, 'active')}
                        className="cursor-pointer rounded-lg bg-[#0df20d]/15 px-3 py-1.5 text-xs font-bold text-[#0df20d] transition-colors hover:bg-[#0df20d]/25 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {acting[m.id] ? '...' : 'تفعيل'}
                      </button>
                    )}
                    {m.status === 'active' && (
                      <button
                        disabled={!!acting[m.id]}
                        onClick={() => void updateStatus(m.id, 'blocked')}
                        className="cursor-pointer rounded-lg bg-red-400/10 px-3 py-1.5 text-xs font-bold text-red-400 transition-colors hover:bg-red-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {acting[m.id] ? '...' : 'حظر'}
                      </button>
                    )}
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
              {loadingMore ? 'جاري التحميل...' : 'تحميل 25 إضافية'}
            </button>
          </div>
        )}
      </div>

      {/* Add / Edit modal */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0a1f0a] p-6 shadow-2xl">
            <h2 className="mb-5 text-lg font-bold text-white">
              {modal === 'add' ? 'إضافة عضو جديد' : 'تعديل بيانات العضو'}
            </h2>

            <div className="flex flex-col gap-4">
              <Field label="الاسم الكامل *">
                <input className={INPUT_CLS} value={form.fullName} onChange={(e) => setField('fullName', e.target.value)} placeholder="محمد ولد أحمد" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="رقم الهاتف *">
                  <input className={INPUT_CLS} dir="ltr" value={form.phoneNumber} onChange={(e) => setField('phoneNumber', e.target.value)} placeholder="2XXXXXXX" maxLength={8} />
                </Field>
                <Field label="رقم واتساب *">
                  <input className={INPUT_CLS} dir="ltr" value={form.whatsappNumber} onChange={(e) => setField('whatsappNumber', e.target.value)} placeholder="2XXXXXXX" maxLength={8} />
                </Field>
              </div>
              <Field label="رقم الهوية الوطنية">
                <input className={INPUT_CLS} dir="ltr" value={form.nationalId} onChange={(e) => setField('nationalId', e.target.value)} placeholder="0000000000" maxLength={10} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="المدينة">
                  <input className={INPUT_CLS} value={form.city} onChange={(e) => setField('city', e.target.value)} placeholder="نواكشوط" />
                </Field>
                <Field label="الولاية">
                  <input className={INPUT_CLS} value={form.regionId} onChange={(e) => setField('regionId', e.target.value)} placeholder="تيرس زمور" />
                </Field>
              </div>

              {/* Outside WhatsApp toggle */}
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, outsideWhatsapp: !p.outsideWhatsapp }))}
                className={`flex w-full cursor-pointer items-center justify-between rounded-xl border px-4 py-3 text-sm transition-colors ${
                  form.outsideWhatsapp
                    ? 'border-slate-500/40 bg-slate-500/10'
                    : 'border-white/10 bg-[#071a07] hover:border-white/20'
                }`}
              >
                <span className={form.outsideWhatsapp ? 'font-semibold text-slate-300' : 'text-slate-400'}>
                  خارج واتساب
                </span>
                <span className={`h-5 w-9 rounded-full transition-colors ${form.outsideWhatsapp ? 'bg-slate-500' : 'bg-white/10'}`}>
                  <span className={`block h-5 w-5 rounded-full border-2 border-[#0a1f0a] bg-white transition-transform ${form.outsideWhatsapp ? 'translate-x-0' : 'translate-x-4'}`} />
                </span>
              </button>
            </div>

            {formError && <p className="mt-4 rounded-lg bg-red-400/10 px-3 py-2 text-sm text-red-400">{formError}</p>}

            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="cursor-pointer rounded-xl bg-white/5 px-5 py-2.5 text-sm font-bold text-slate-400 transition-colors hover:bg-white/10"
              >
                إلغاء
              </button>
              <button
                onClick={() => void submitForm()}
                disabled={formSaving}
                className="cursor-pointer rounded-xl bg-[#0df20d] px-5 py-2.5 text-sm font-bold text-slate-900 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {formSaving ? 'جاري الحفظ...' : modal === 'add' ? 'إضافة' : 'حفظ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
