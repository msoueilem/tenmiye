'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useMemberAuth } from '@/context/MemberAuthContext';
import { memberFetch } from '@/lib/memberApi';

interface BackendUser {
  id: string;
  fullName: string;
  fullNameAr?: string | null;
  fullNameFr?: string | null;
  phoneNumber: string;
  whatsappNumber: string;
  nationalId?: string | null;
  city?: string | null;
  region?: string | null;
  roleId: string;
  tierId: string;
  profilePictureId?: string | null;
  status: 'active' | 'pending' | 'blocked';
  createdAt?: unknown;
}

type UserForm = {
  fullName: string;
  fullNameAr: string;
  phoneNumber: string;
  whatsappNumber: string;
  nationalId: string;
  city: string;
  region: string;
  tierId: string;
  status: 'active' | 'pending' | 'blocked';
};

const EMPTY_FORM: UserForm = {
  fullName: '', fullNameAr: '', phoneNumber: '', whatsappNumber: '',
  nationalId: '', city: '', region: '', tierId: 'standard', status: 'active',
};

function statusBadge(status: BackendUser['status']) {
  if (status === 'active') return <span className="rounded-full bg-green-50 text-green-700 border border-green-200 px-2.5 py-0.5 text-[10px] font-bold">نشط</span>;
  if (status === 'pending') return <span className="rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 text-[10px] font-bold">معلّق</span>;
  return <span className="rounded-full bg-red-50 text-red-700 border border-red-200 px-2.5 py-0.5 text-[10px] font-bold">محظور</span>;
}

export default function MembersPage() {
  const { getAccessToken } = useMemberAuth();
  const [users, setUsers] = useState<BackendUser[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | BackendUser['status']>('all');

  const [viewingUser, setViewingUser] = useState<BackendUser | null>(null);
  const [editingUser, setEditingUser] = useState<BackendUser | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState<UserForm>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  async function fetchPage(cursor?: string) {
    const token = await getAccessToken();
    if (!token) { setError('انتهت الجلسة.'); return; }

    const params = new URLSearchParams({ limit: '50' });
    if (cursor) params.set('cursor', cursor);

    const res = await memberFetch(`/users?${params}`, token);
    if (res.status === 403) { setError('ليس لديك صلاحية إدارة الأعضاء.'); return; }
    if (!res.ok) { setError('تعذّر تحميل الأعضاء.'); return; }

    return res.json() as Promise<{ data: BackendUser[]; nextCursor: string | null }>;
  }

  useEffect(() => {
    let mounted = true;
    async function load() {
      const result = await fetchPage();
      if (!mounted) return;
      if (result) { setUsers(result.data); setNextCursor(result.nextCursor); }
      setLoading(false);
    }
    void load();
    return () => { mounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadMore() {
    if (!nextCursor) return;
    setLoadingMore(true);
    const result = await fetchPage(nextCursor);
    if (result) { setUsers((p) => [...p, ...result.data]); setNextCursor(result.nextCursor); }
    setLoadingMore(false);
  }

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch = !searchTerm ||
        u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.phoneNumber.includes(searchTerm) ||
        (u.fullNameAr ?? '').includes(searchTerm);
      const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [users, searchTerm, statusFilter]);

  function openEdit(u: BackendUser) {
    setEditingUser(u);
    setForm({
      fullName: u.fullName,
      fullNameAr: u.fullNameAr ?? '',
      phoneNumber: u.phoneNumber,
      whatsappNumber: u.whatsappNumber,
      nationalId: u.nationalId ?? '',
      city: u.city ?? '',
      region: u.region ?? '',
      tierId: u.tierId,
      status: u.status,
    });
    setFormError('');
  }

  function openAdd() {
    setForm(EMPTY_FORM);
    setFormError('');
    setIsAddOpen(true);
  }

  async function handleSave() {
    if (!form.fullName.trim() || !form.phoneNumber || !form.whatsappNumber) {
      setFormError('الاسم ورقم الهاتف والواتساب مطلوبة');
      return;
    }
    setIsSaving(true);
    setFormError('');
    const token = await getAccessToken();
    if (!token) { setFormError('انتهت الجلسة'); setIsSaving(false); return; }

    const payload = {
      fullName: form.fullName.trim(),
      fullNameAr: form.fullNameAr.trim() || undefined,
      phoneNumber: form.phoneNumber.trim(),
      whatsappNumber: form.whatsappNumber.trim(),
      nationalId: form.nationalId.trim() || undefined,
      city: form.city.trim() || undefined,
      region: form.region.trim() || undefined,
      tierId: form.tierId,
      status: form.status,
    };

    const res = editingUser
      ? await memberFetch(`/users/${editingUser.id}`, token, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      : await memberFetch('/users', token, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

    if (!res.ok) {
      const json = await res.json().catch(() => ({})) as { message?: string | string[] };
      const msg = Array.isArray(json.message) ? json.message[0] : json.message;
      setFormError(msg ?? 'حدث خطأ أثناء الحفظ');
      setIsSaving(false);
      return;
    }

    setIsSaving(false);
    setEditingUser(null);
    setIsAddOpen(false);
    const result = await fetchPage();
    if (result) { setUsers(result.data); setNextCursor(result.nextCursor); }
  }

  async function handleDelete(id: string) {
    if (!confirm('هل أنت متأكد من حذف هذا العضو؟')) return;
    const token = await getAccessToken();
    if (!token) return;
    await memberFetch(`/users/${id}`, token, { method: 'DELETE' });
    setUsers((p) => p.filter((u) => u.id !== id));
  }

  async function toggleStatus(u: BackendUser) {
    const newStatus = u.status === 'active' ? 'blocked' : 'active';
    const token = await getAccessToken();
    if (!token) return;
    const res = await memberFetch(`/users/${u.id}`, token, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) setUsers((p) => p.map((x) => x.id === u.id ? { ...x, status: newStatus } : x));
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#0df20d] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const modalOpen = editingUser || isAddOpen;

  return (
    <div className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h2 className="text-slate-900 dark:text-white text-3xl font-bold tracking-tight">إدارة الأعضاء</h2>
          <p className="text-slate-500 dark:text-slate-400 text-base">{users.length} عضو مسجل</p>
        </div>
        <button
          onClick={openAdd}
          className="flex cursor-pointer items-center gap-2 bg-[#0df20d] hover:bg-[#0be00b] text-slate-900 font-bold py-2.5 px-5 rounded-lg shadow-sm transition-all"
        >
          <span className="material-symbols-outlined">person_add</span>
          إضافة عضو
        </button>
      </div>

      {error && <p className="mb-4 text-red-500">{error}</p>}

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder="بحث بالاسم أو رقم الهاتف..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0df20d]/20"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm text-slate-900 dark:text-white focus:outline-none"
        >
          <option value="all">جميع الحالات</option>
          <option value="active">نشط</option>
          <option value="pending">معلّق</option>
          <option value="blocked">محظور</option>
        </select>
      </div>

      <div className="bg-white dark:bg-[#1a331a] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="text-right p-4 font-bold text-slate-600 dark:text-slate-400">الاسم</th>
              <th className="text-right p-4 font-bold text-slate-600 dark:text-slate-400 hidden sm:table-cell">الهاتف</th>
              <th className="text-right p-4 font-bold text-slate-600 dark:text-slate-400 hidden md:table-cell">المدينة</th>
              <th className="text-right p-4 font-bold text-slate-600 dark:text-slate-400">الحالة</th>
              <th className="text-right p-4 font-bold text-slate-600 dark:text-slate-400">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/20 transition-colors">
                <td className="p-4">
                  <p className="font-semibold text-slate-900 dark:text-white">{u.fullName}</p>
                  {u.fullNameAr && <p className="text-xs text-slate-400">{u.fullNameAr}</p>}
                </td>
                <td className="p-4 text-slate-600 dark:text-slate-400 hidden sm:table-cell" dir="ltr">{u.phoneNumber}</td>
                <td className="p-4 text-slate-600 dark:text-slate-400 hidden md:table-cell">{u.city ?? '—'}</td>
                <td className="p-4">{statusBadge(u.status)}</td>
                <td className="p-4">
                  <div className="flex gap-1">
                    <button onClick={() => setViewingUser(u)} className="cursor-pointer p-1.5 text-slate-400 hover:text-blue-600 transition-colors">
                      <span className="material-symbols-outlined text-[18px]">visibility</span>
                    </button>
                    <button onClick={() => openEdit(u)} className="cursor-pointer p-1.5 text-slate-400 hover:text-amber-600 transition-colors">
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button onClick={() => void toggleStatus(u)} className="cursor-pointer p-1.5 text-slate-400 hover:text-green-600 transition-colors">
                      <span className="material-symbols-outlined text-[18px]">{u.status === 'active' ? 'block' : 'check_circle'}</span>
                    </button>
                    <button onClick={() => void handleDelete(u.id)} className="cursor-pointer p-1.5 text-slate-400 hover:text-red-600 transition-colors">
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="p-10 text-center text-slate-400">لا توجد نتائج.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {nextCursor && (
        <div className="mt-4 flex justify-center">
          <button onClick={() => void loadMore()} disabled={loadingMore} className="cursor-pointer rounded-lg bg-slate-100 dark:bg-slate-800 px-6 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed">
            {loadingMore ? 'جاري التحميل...' : 'تحميل المزيد'}
          </button>
        </div>
      )}

      {/* View Modal */}
      {viewingUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1a331a] w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-black text-xl">{viewingUser.fullName}</h3>
              <button onClick={() => setViewingUser(null)} className="cursor-pointer text-slate-400 hover:text-slate-600"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-6 space-y-3 text-sm">
              {([
                ['الاسم بالعربية', viewingUser.fullNameAr],
                ['الاسم بالفرنسية', viewingUser.fullNameFr],
                ['الهاتف', viewingUser.phoneNumber],
                ['الواتساب', viewingUser.whatsappNumber],
                ['رقم الهوية', viewingUser.nationalId],
                ['المدينة', viewingUser.city],
                ['المنطقة', viewingUser.region],
                ['الحالة', viewingUser.status],
                ['الدور', viewingUser.roleId],
              ] as [string, string | null | undefined][]).filter(([, v]) => v).map(([label, val]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-slate-500">{label}</span>
                  <span className="font-medium text-slate-900 dark:text-white">{val}</span>
                </div>
              ))}
            </div>
            <div className="p-6 border-t border-slate-100 dark:border-slate-800">
              <button onClick={() => setViewingUser(null)} className="w-full cursor-pointer h-10 bg-slate-100 dark:bg-slate-800 rounded-lg font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1a331a] w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-black text-xl">{editingUser ? 'تعديل عضو' : 'إضافة عضو جديد'}</h3>
              <button onClick={() => { setEditingUser(null); setIsAddOpen(false); }} className="cursor-pointer text-slate-400 hover:text-slate-600"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto max-h-[65vh]">
              {formError && <p className="text-sm text-red-500 font-bold">{formError}</p>}
              {([
                { label: 'الاسم الكامل *', key: 'fullName' },
                { label: 'الاسم بالعربية', key: 'fullNameAr' },
                { label: 'رقم الهاتف *', key: 'phoneNumber' },
                { label: 'رقم الواتساب *', key: 'whatsappNumber' },
                { label: 'رقم الهوية الوطنية', key: 'nationalId' },
                { label: 'المدينة', key: 'city' },
                { label: 'المنطقة', key: 'region' },
              ] as { label: string; key: keyof UserForm }[]).map(({ label, key }) => (
                <div key={key}>
                  <label className="block text-xs font-bold text-slate-500 mb-1">{label}</label>
                  <input
                    type="text"
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0df20d]/20"
                    value={form[key] as string}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">الحالة</label>
                <select
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as UserForm['status'] })}
                >
                  <option value="active">نشط</option>
                  <option value="pending">معلّق</option>
                  <option value="blocked">محظور</option>
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex gap-3">
              <button onClick={() => void handleSave()} disabled={isSaving} className="flex-1 cursor-pointer h-11 bg-[#0df20d] text-slate-900 rounded-lg font-bold hover:bg-[#0be00b] disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                {isSaving ? 'جاري الحفظ...' : 'حفظ'}
              </button>
              <button onClick={() => { setEditingUser(null); setIsAddOpen(false); }} className="cursor-pointer px-8 h-11 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold hover:bg-slate-50 transition-all">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
