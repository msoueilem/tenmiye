'use client';

import { useEffect, useState } from 'react';
import type { Tier, CreateTierDto } from '@/types/tiers';
import { apiFetch } from '@/lib/api';

type Mode = 'list' | 'create' | 'edit';

const getTiers = (): Promise<Tier[]> => apiFetch('GET', '/tiers', { tokenType: 'admin' });
const createTier = (dto: CreateTierDto): Promise<Tier> => apiFetch('POST', '/tiers', { body: dto, tokenType: 'admin' });
const updateTier = (id: string, dto: Partial<CreateTierDto>): Promise<Tier> => apiFetch('PATCH', `/tiers/${id}`, { body: dto, tokenType: 'admin' });
const deleteTier = (id: string): Promise<void> => apiFetch('DELETE', `/tiers/${id}`, { tokenType: 'admin' });

const emptyForm = (): CreateTierDto => ({
  name: '',
  slug: '',
  description: '',
  monthlyAmount: 0,
});

export default function AdminTiersPage() {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [mode, setMode] = useState<Mode>('list');
  const [editing, setEditing] = useState<Tier | null>(null);
  const [form, setForm] = useState<CreateTierDto>(emptyForm());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getTiers().then(setTiers).catch(() => setError('فشل تحميل الفئات'));
  }, []);

  const resetForm = () => {
    setForm(emptyForm());
    setEditing(null);
    setMode('list');
    setError('');
  };

  const handleEdit = (tier: Tier) => {
    setEditing(tier);
    setForm({
      name: tier.name,
      slug: tier.slug,
      description: tier.description ?? '',
      monthlyAmount: tier.monthlyAmount,
    });
    setMode('edit');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الفئة؟')) return;
    setLoading(true);
    try {
      await deleteTier(id);
      setTiers((prev) => prev.filter((t) => t.id !== id));
    } catch {
      setError('فشل الحذف');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (mode === 'edit' && editing) {
        const updated = await updateTier(editing.id, form);
        setTiers((prev) => prev.map((t) => (t.id === editing.id ? updated : t)));
      } else {
        const created = await createTier(form);
        setTiers((prev) => [...prev, created]);
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
      <div className="p-6 max-w-2xl mx-auto" dir="rtl">
        <h1 className="text-xl font-bold text-[#d4af37] mb-6">
          {mode === 'edit' ? 'تعديل الفئة' : 'فئة جديدة'}
        </h1>
        {error && <p className="text-red-400 mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#d4af37]/30"
            placeholder="اسم الفئة"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            required
          />
          <input
            className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#d4af37]/30"
            placeholder="المعرّف (slug) — حروف لاتينية وأرقام وشرطات"
            value={form.slug}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
              }))
            }
            required
          />
          <input
            className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#d4af37]/30"
            placeholder="الوصف (اختياري)"
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          />
          <div>
            <label className="mb-1 block text-sm text-slate-400">الاشتراك الشهري (MRU)</label>
            <input
              type="number"
              className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#d4af37]/30"
              placeholder="المبلغ الشهري"
              min={1}
              value={form.monthlyAmount || ''}
              onChange={(e) =>
                setForm((p) => ({ ...p, monthlyAmount: parseFloat(e.target.value) || 0 }))
              }
              required
            />
          </div>
          <div className="mt-2 flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-[#d4af37] px-4 py-3 font-bold text-slate-900 hover:bg-[#c9a227] disabled:opacity-50"
            >
              {loading ? 'جاري الحفظ...' : 'حفظ'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="flex-1 rounded-lg border border-slate-700 px-4 py-3 text-slate-400 hover:text-white"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="p-6" dir="rtl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#d4af37]">فئات العضوية</h1>
        <button
          onClick={() => setMode('create')}
          className="rounded-lg bg-[#d4af37] px-4 py-2 font-bold text-slate-900 hover:bg-[#c9a227]"
        >
          + فئة جديدة
        </button>
      </div>
      {error && <p className="mb-4 text-red-400">{error}</p>}
      <div className="space-y-3">
        {tiers.map((tier) => (
          <div
            key={tier.id}
            className="flex items-center justify-between rounded-lg border border-[#d4af37]/20 bg-white/5 p-4"
          >
            <div>
              <p className="font-semibold text-white">{tier.name}</p>
              <p className="text-sm text-slate-400">
                {tier.slug} • {tier.monthlyAmount} MRU / شهر
              </p>
              {tier.description && (
                <p className="mt-1 text-sm text-slate-500">{tier.description}</p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleEdit(tier)}
                className="text-sm text-[#d4af37] hover:underline"
              >
                تعديل
              </button>
              <button
                onClick={() => handleDelete(tier.id)}
                disabled={loading}
                className="text-sm text-red-400 hover:underline disabled:opacity-50"
              >
                حذف
              </button>
            </div>
          </div>
        ))}
        {tiers.length === 0 && (
          <p className="py-8 text-center text-slate-500">لا توجد فئات حتى الآن</p>
        )}
      </div>
    </div>
  );
}
