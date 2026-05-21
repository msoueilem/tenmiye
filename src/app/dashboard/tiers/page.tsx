'use client';

import { useEffect, useState } from 'react';
import { useMemberAuth } from '@/context/MemberAuthContext';
import type { Tier, CreateTierDto } from '@/types/tiers';
import { getTiers, createTier, updateTier } from '@/features/tiers/api.client';

type Mode = 'list' | 'create' | 'edit';

const emptyForm = (): CreateTierDto => ({
  name: '',
  slug: '',
  description: '',
  monthlyAmount: 0,
});

export default function DashboardTiersPage() {
  const { user } = useMemberAuth();
  const canWrite = user?.permissions.includes('MANAGE_TIERS') ?? false;

  const [tiers, setTiers] = useState<Tier[]>([]);
  const [mode, setMode] = useState<Mode>('list');
  const [editing, setEditing] = useState<Tier | null>(null);
  const [form, setForm] = useState<CreateTierDto>(emptyForm());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getTiers()
      .then(setTiers)
      .catch(() => setError('فشل تحميل الفئات'))
      .finally(() => setLoading(false));
  }, []);

  const resetForm = () => {
    setForm(emptyForm());
    setEditing(null);
    setMode('list');
    setError('');
  };

  const handleEdit = (tier: Tier) => {
    if (!canWrite) return;
    setEditing(tier);
    setForm({
      name: tier.name,
      slug: tier.slug,
      description: tier.description ?? '',
      monthlyAmount: tier.monthlyAmount,
    });
    setMode('edit');
  };

  const handleToggleActive = async (tier: Tier) => {
    if (!canWrite) return;
    setSaving(true);
    try {
      const updated = await updateTier(tier.id, { isActive: !tier.isActive });
      setTiers((prev) => prev.map((t) => (t.id === tier.id ? updated : t)));
    } catch {
      setError('فشل تغيير حالة الفئة');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) return;
    setSaving(true);
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
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl border border-white/10 bg-[#071a07]" />
        ))}
      </div>
    );
  }

  if (mode === 'create' || mode === 'edit') {
    return (
      <div className="mx-auto max-w-2xl" dir="rtl">
        <h1 className="mb-6 text-xl font-bold text-[#0df20d]">
          {mode === 'edit' ? 'تعديل الفئة' : 'فئة جديدة'}
        </h1>
        {error && <p className="mb-4 text-red-400">{error}</p>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#0df20d]/30"
            placeholder="اسم الفئة"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            required
          />
          <input
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#0df20d]/30"
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
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#0df20d]/30"
            placeholder="الوصف (اختياري)"
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          />
          <div>
            <label className="mb-1 block text-sm text-slate-400">الاشتراك الشهري (MRU)</label>
            <input
              type="number"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#0df20d]/30"
              placeholder="المبلغ الشهري"
              min={1}
              value={form.monthlyAmount || ''}
              onChange={(e) =>
                setForm((p) => ({ ...p, monthlyAmount: parseFloat(e.target.value) || 0 }))
              }
              required
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={form.isActive ?? true}
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
    <div className="mx-auto max-w-2xl" dir="rtl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#0df20d]">فئات العضوية</h1>
        {canWrite && (
          <button
            onClick={() => setMode('create')}
            className="rounded-lg bg-[#0df20d] px-4 py-2 font-bold text-slate-900 hover:bg-[#0be00b]"
          >
            + فئة جديدة
          </button>
        )}
      </div>
      {error && <p className="mb-4 text-red-400">{error}</p>}
      <div className="space-y-3">
        {tiers.map((tier) => (
          <div
            key={tier.id}
            className="flex items-center justify-between rounded-xl border border-white/10 bg-[#071a07] p-4"
          >
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-white">{tier.name}</p>
                <span className={`text-xs ${tier.isActive ? 'text-green-400' : 'text-slate-500'}`}>
                  {tier.isActive ? '● نشط' : '○ معطّل'}
                </span>
              </div>
              <p className="text-xs text-slate-500">{tier.slug}</p>
              {tier.description && (
                <p className="mt-1 text-sm text-slate-400">{tier.description}</p>
              )}
              <p className="mt-1 text-sm font-semibold text-[#0df20d]">
                {tier.monthlyAmount} MRU / شهر
              </p>
            </div>
            {canWrite && (
              <div className="flex shrink-0 flex-col gap-1">
                <button
                  onClick={() => handleToggleActive(tier)}
                  disabled={saving}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-50 ${
                    tier.isActive
                      ? 'bg-white/5 text-yellow-400 hover:bg-white/10'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  {tier.isActive ? 'تعطيل' : 'تفعيل'}
                </button>
                <button
                  onClick={() => handleEdit(tier)}
                  className="rounded-lg bg-white/5 px-3 py-1.5 text-xs font-bold text-[#0df20d] hover:bg-white/10"
                >
                  تعديل
                </button>
              </div>
            )}
          </div>
        ))}
        {tiers.length === 0 && (
          <p className="py-8 text-center text-slate-500">لا توجد فئات</p>
        )}
      </div>
    </div>
  );
}
