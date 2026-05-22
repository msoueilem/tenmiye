'use client';

import { useEffect, useState } from 'react';
import { useMemberAuth } from '@/context/MemberAuthContext';
import type { Announcement, CreateAnnouncementDto } from '@/types/announcements';
import {
  getActiveAnnouncements,
  getAllAnnouncements,
  createAnnouncement,
  updateAnnouncement,
} from '@/features/announcements/api.client';

type Mode = 'list' | 'create' | 'edit';

const TYPE_LABEL: Record<string, string> = { info: 'معلومة', warning: 'تحذير', event: 'حدث' };
const TYPE_COLOR: Record<string, string> = {
  info: 'text-blue-400',
  warning: 'text-yellow-400',
  event: 'text-purple-400',
};

const emptyForm = (): CreateAnnouncementDto => ({
  message: '',
  type: 'info',
  isActive: true,
  startDate: new Date().toISOString().slice(0, 10),
  endDate: '',
  ctaLabel: '',
  ctaUrl: '',
});

export default function MemberAnnouncementsPage() {
  const { user } = useMemberAuth();
  const canWrite = user?.permissions.includes('MANAGE_ANNOUNCEMENTS') ?? false;

  const [items, setItems] = useState<Announcement[]>([]);
  const [mode, setMode] = useState<Mode>('list');
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [form, setForm] = useState<CreateAnnouncementDto>(emptyForm());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetch = canWrite ? getAllAnnouncements() : getActiveAnnouncements();
    fetch
      .then(setItems)
      .catch(() => setError('فشل تحميل الإعلانات'))
      .finally(() => setLoading(false));
  }, [canWrite]);

  const resetForm = () => {
    setForm(emptyForm());
    setEditing(null);
    setMode('list');
    setError('');
  };

  const handleEdit = (item: Announcement) => {
    if (!canWrite) return;
    setEditing(item);
    setForm({
      message: item.message,
      type: item.type,
      isActive: item.isActive,
      startDate: item.startDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
      endDate: item.endDate?.slice(0, 10) ?? '',
      ctaLabel: item.ctaLabel ?? '',
      ctaUrl: item.ctaUrl ?? '',
    });
    setMode('edit');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) return;
    setSaving(true);
    setError('');
    try {
      if (mode === 'edit' && editing) {
        const updated = await updateAnnouncement(editing.id, form);
        setItems((prev) => prev.map((i) => (i.id === editing.id ? updated : i)));
      } else {
        const created = await createAnnouncement(form);
        setItems((prev) => [...prev, created]);
      }
      resetForm();
    } catch {
      setError('فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl border border-white/10 bg-[#071a07]" />
        ))}
      </div>
    );
  }

  if (mode === 'create' || mode === 'edit') {
    return (
      <div className="max-w-2xl" dir="rtl">
        <h1 className="mb-6 text-xl font-bold text-[#0df20d]">
          {mode === 'edit' ? 'تعديل الإعلان' : 'إضافة إعلان'}
        </h1>
        {error && <p className="mb-4 text-red-400">{error}</p>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <textarea
            className="w-full rounded-lg border border-white/10 bg-[#071a07] px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#0df20d]/30"
            placeholder="نص الإعلان (500 حرف كحد أقصى)"
            value={form.message}
            onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
            maxLength={500}
            rows={3}
            required
          />
          <select
            className="w-full rounded-lg border border-white/10 bg-[#071a07] px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#0df20d]/30"
            value={form.type}
            onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as Announcement['type'] }))}
          >
            <option value="info">معلومة</option>
            <option value="warning">تحذير</option>
            <option value="event">حدث</option>
          </select>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm text-slate-400">تاريخ البدء</label>
              <input
                type="date"
                className="w-full rounded-lg border border-white/10 bg-[#071a07] px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#0df20d]/30"
                value={form.startDate}
                onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-400">تاريخ الانتهاء</label>
              <input
                type="date"
                className="w-full rounded-lg border border-white/10 bg-[#071a07] px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#0df20d]/30"
                value={form.endDate}
                onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
                required
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
              className="accent-[#0df20d]"
            />
            نشط
          </label>
          <div className="mt-2 flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-[#0df20d] px-4 py-3 font-bold text-slate-900 hover:bg-[#0be00b] disabled:opacity-50"
            >
              {saving ? 'جاري الحفظ...' : 'حفظ'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="flex-1 rounded-lg border border-white/10 px-4 py-3 text-slate-400 hover:text-white"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div dir="rtl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#0df20d]">الإعلانات</h1>
        {canWrite && (
          <button
            onClick={() => setMode('create')}
            className="rounded-lg bg-[#0df20d] px-4 py-2 font-bold text-slate-900 hover:bg-[#0be00b]"
          >
            + إضافة إعلان
          </button>
        )}
      </div>
      {error && <p className="mb-4 text-red-400">{error}</p>}
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-start justify-between gap-4 rounded-xl border border-white/10 bg-[#071a07] p-4"
          >
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <span className={`text-xs font-bold ${TYPE_COLOR[item.type] ?? 'text-slate-400'}`}>
                  {TYPE_LABEL[item.type] ?? item.type}
                </span>
                {!item.isActive && (
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-slate-500">
                    غير نشط
                  </span>
                )}
              </div>
              <p className="line-clamp-2 text-sm text-white">{item.message}</p>
              <p className="mt-1 text-xs text-slate-500">
                {item.startDate?.slice(0, 10)} — {item.endDate?.slice(0, 10)}
              </p>
            </div>
            {canWrite && (
              <button
                onClick={() => handleEdit(item)}
                className="shrink-0 rounded-lg bg-white/5 px-3 py-1.5 text-xs font-bold text-[#0df20d] hover:bg-white/10"
              >
                تعديل
              </button>
            )}
          </div>
        ))}
        {items.length === 0 && (
          <p className="py-8 text-center text-slate-500">لا توجد إعلانات</p>
        )}
      </div>
    </div>
  );
}
