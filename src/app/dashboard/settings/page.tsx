'use client';

import { useEffect, useState } from 'react';
import { useMemberAuth } from '@/context/MemberAuthContext';
import { memberFetch } from '@/lib/memberApi';

interface SettingsData {
  title?: string;
  aboutText?: string;
  projectsCount?: number;
  achievements?: string[];
}

export default function SettingsPage() {
  const { getAccessToken } = useMemberAuth();
  const [form, setForm] = useState<SettingsData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [newAchievement, setNewAchievement] = useState('');

  useEffect(() => {
    let mounted = true;
    async function load() {
      const token = await getAccessToken();
      if (!token) { setError('انتهت الجلسة.'); setLoading(false); return; }
      const res = await memberFetch('/settings/public', token);
      if (!res.ok) { setError('تعذّر تحميل الإعدادات.'); setLoading(false); return; }
      const json = await res.json() as SettingsData;
      if (mounted) {
        setForm({
          title: json.title ?? '',
          aboutText: json.aboutText ?? '',
          projectsCount: json.projectsCount ?? 0,
          achievements: json.achievements ?? [],
        });
        setLoading(false);
      }
    }
    void load();
    return () => { mounted = false; };
  }, [getAccessToken]);

  async function save() {
    setSaving(true);
    setError('');
    setSuccess(false);
    const token = await getAccessToken();
    if (!token) { setError('انتهت الجلسة.'); setSaving(false); return; }
    const res = await memberFetch('/settings', token, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } else {
      setError('تعذّر حفظ الإعدادات.');
    }
    setSaving(false);
  }

  function addAchievement() {
    const trimmed = newAchievement.trim();
    if (!trimmed) return;
    setForm((prev) => ({ ...prev, achievements: [...(prev.achievements ?? []), trimmed] }));
    setNewAchievement('');
  }

  function removeAchievement(index: number) {
    setForm((prev) => ({
      ...prev,
      achievements: (prev.achievements ?? []).filter((_, i) => i !== index),
    }));
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-white/10" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 w-full animate-pulse rounded-xl bg-white/5" />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-white">إعدادات الصفحة الرئيسية</h1>

      {error && <p className="mb-4 rounded-lg bg-red-400/10 px-4 py-3 text-sm text-red-400">{error}</p>}
      {success && <p className="mb-4 rounded-lg bg-[#0df20d]/10 px-4 py-3 text-sm text-[#0df20d]">تم الحفظ بنجاح.</p>}

      <div className="flex flex-col gap-5">
        {/* Title */}
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-300">اسم المجموعة</label>
          <input
            type="text"
            value={form.title ?? ''}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            className="w-full rounded-xl border border-white/10 bg-[#071a07] px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-[#0df20d]/40 focus:ring-1 focus:ring-[#0df20d]/20"
          />
        </div>

        {/* About */}
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-300">نبذة عن المجموعة</label>
          <textarea
            rows={5}
            value={form.aboutText ?? ''}
            onChange={(e) => setForm((p) => ({ ...p, aboutText: e.target.value }))}
            className="w-full resize-none rounded-xl border border-white/10 bg-[#071a07] px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-[#0df20d]/40 focus:ring-1 focus:ring-[#0df20d]/20"
          />
        </div>

        {/* Projects count */}
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-300">عدد المشاريع</label>
          <input
            type="number"
            min={0}
            value={form.projectsCount ?? 0}
            onChange={(e) => setForm((p) => ({ ...p, projectsCount: parseInt(e.target.value, 10) || 0 }))}
            className="w-40 rounded-xl border border-white/10 bg-[#071a07] px-4 py-3 text-sm text-white outline-none focus:border-[#0df20d]/40 focus:ring-1 focus:ring-[#0df20d]/20"
          />
        </div>

        {/* Achievements */}
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-300">الإنجازات</label>
          <ul className="mb-3 flex flex-col gap-2">
            {(form.achievements ?? []).map((a, i) => (
              <li key={i} className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#071a07] px-4 py-2.5 text-sm text-slate-200">
                <span className="flex-1">{a}</span>
                <button
                  onClick={() => removeAchievement(i)}
                  className="cursor-pointer text-slate-600 transition-colors hover:text-red-400"
                  aria-label="حذف"
                >
                  ✕
                </button>
              </li>
            ))}
            {(form.achievements ?? []).length === 0 && (
              <li className="text-sm text-slate-600">لا توجد إنجازات مضافة.</li>
            )}
          </ul>
          <div className="flex gap-2">
            <input
              type="text"
              value={newAchievement}
              onChange={(e) => setNewAchievement(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAchievement(); } }}
              placeholder="أضف إنجازاً..."
              className="flex-1 rounded-xl border border-white/10 bg-[#071a07] px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-[#0df20d]/40 focus:ring-1 focus:ring-[#0df20d]/20"
            />
            <button
              onClick={addAchievement}
              className="cursor-pointer rounded-xl bg-white/5 px-4 py-2.5 text-sm font-bold text-slate-300 transition-colors hover:bg-white/10"
            >
              إضافة
            </button>
          </div>
        </div>

        {/* Save */}
        <div className="pt-2">
          <button
            onClick={() => void save()}
            disabled={saving}
            className="cursor-pointer rounded-xl bg-[#0df20d] px-8 py-3 text-sm font-bold text-slate-900 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
          </button>
        </div>
      </div>
    </div>
  );
}
