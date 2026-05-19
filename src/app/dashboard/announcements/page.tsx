'use client';

import { useEffect, useState } from 'react';
import { useMemberAuth } from '@/context/MemberAuthContext';
import type { Announcement, CreateAnnouncementDto } from '@/types/announcements';
import {
  getAllAnnouncements,
  createAnnouncement,
  updateAnnouncement,
} from '@/features/announcements/api.client';

type Mode = 'list' | 'create' | 'edit';

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
  const canWrite = user?.permissions.includes('MANAGE_SETTINGS') ?? false;

  const [items, setItems] = useState<Announcement[]>([]);
  const [mode, setMode] = useState<Mode>('list');
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [form, setForm] = useState<CreateAnnouncementDto>(emptyForm());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getAllAnnouncements().then(setItems).catch(() => setError('فشل تحميل الإعلانات'));
  }, []);

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
      startDate: item.startDate.slice(0, 10),
      endDate: item.endDate.slice(0, 10),
      ctaLabel: item.ctaLabel ?? '',
      ctaUrl: item.ctaUrl ?? '',
    });
    setMode('edit');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) return;
    setLoading(true);
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
      setLoading(false);
    }
  };

  if (mode === 'create' || mode === 'edit') {
    return (
      <div className="max-w-2xl" dir="rtl">
        <h1 className="mb-6 text-xl font-bold text-[#0df20d]">
          {mode === 'edit' ? 'تعديل الإعلان' : 'إضافة إعلان'}
        </h1>
        {error && <p className="mb-4 text-red-400">{error}</p>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <textarea
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#0df20d]/30"
            placeholder="نص الإعلان (500 حرف كحد أقصى)"
            value={form.message}
            onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
            maxLength={500}
            rows={3}
            required
          />
          <select
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#0df20d]/30"
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
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#0df20d]/30"
                value={form.startDate}
                onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-400">تاريخ الانتهاء</label>
              <input
                type="date"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#0df20d]/30"
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
            />
            نشط
          </label>
          <div className="mt-2 flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-[#0df20d] px-4 py-3 font-bold text-slate-900 hover:bg-[#0be00b] disabled:opacity-50"
            >
              {loading ? 'جاري الحفظ...' : 'حفظ'}
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
            className="flex items-center justify-between rounded-lg border border-[#0df20d]/20 bg-white/5 p-4"
          >
            <div>
              <p className="line-clamp-1 font-semibold text-white">{item.message}</p>
              <p className="text-sm text-slate-400">
                {item.startDate.slice(0, 10)} — {item.endDate.slice(0, 10)}
              </p>
            </div>
            {canWrite && (
              <button
                onClick={() => handleEdit(item)}
                className="text-sm text-[#0df20d] hover:underline"
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
