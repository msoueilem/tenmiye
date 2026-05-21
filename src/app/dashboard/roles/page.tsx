'use client';

import { useEffect, useState } from 'react';
import { useMemberAuth } from '@/context/MemberAuthContext';
import type { Role, CreateRoleDto } from '@/types/roles';
import { getRoles, createRole, updateRole } from '@/features/roles/api.client';

type Mode = 'list' | 'create' | 'edit';

const ALL_PERMISSIONS = [
  'READ_ALL',
  'READ_MESSAGES',
  'MANAGE_REGISTRATIONS',
  'MANAGE_USERS',
  'MANAGE_BOARDS',
  'MANAGE_ELECTIONS',
  'MANAGE_FINANCE',
  'MANAGE_ANNOUNCEMENTS',
  'MANAGE_TIERS',
  'MANAGE_ROLES',
  'MODERATE_BLOG',
  'MANAGE_SETTINGS',
] as const;

const emptyForm = (): CreateRoleDto => ({
  name: '',
  slug: '',
  description: '',
  responsibilities: [],
  permissions: [],
});

export default function DashboardRolesPage() {
  const { user } = useMemberAuth();
  const canWrite = user?.permissions.includes('MANAGE_ROLES') ?? false;

  const [roles, setRoles] = useState<Role[]>([]);
  const [mode, setMode] = useState<Mode>('list');
  const [editing, setEditing] = useState<Role | null>(null);
  const [form, setForm] = useState<CreateRoleDto>(emptyForm());
  const [responsibilitiesInput, setResponsibilitiesInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getRoles()
      .then(setRoles)
      .catch(() => setError('فشل تحميل الأدوار'))
      .finally(() => setLoading(false));
  }, []);

  const resetForm = () => {
    setForm(emptyForm());
    setResponsibilitiesInput('');
    setEditing(null);
    setMode('list');
    setError('');
  };

  const handleEdit = (role: Role) => {
    if (!canWrite) return;
    setEditing(role);
    setForm({
      name: role.name,
      slug: role.slug,
      description: role.description ?? '',
      responsibilities: role.responsibilities ?? [],
      permissions: role.permissions,
    });
    setResponsibilitiesInput((role.responsibilities ?? []).join('\n'));
    setMode('edit');
  };

  const togglePermission = (perm: string) => {
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter((p) => p !== perm)
        : [...prev.permissions, perm],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) return;
    const responsibilities = responsibilitiesInput
      .split('\n')
      .map((r) => r.trim())
      .filter(Boolean);
    const payload = { ...form, responsibilities };
    setSaving(true);
    setError('');
    try {
      if (mode === 'edit' && editing) {
        const updated = await updateRole(editing.id, payload);
        setRoles((prev) => prev.map((r) => (r.id === editing.id ? updated : r)));
      } else {
        const created = await createRole(payload);
        setRoles((prev) => [...prev, created]);
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
          {mode === 'edit' ? 'تعديل الدور' : 'دور جديد'}
        </h1>
        {error && <p className="mb-4 text-red-400">{error}</p>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#0df20d]/30"
            placeholder="اسم الدور"
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
            <label className="mb-1 block text-sm text-slate-400">المسؤوليات (سطر لكل مسؤولية)</label>
            <textarea
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#0df20d]/30"
              placeholder="متابعة القرارات&#10;المشاركة في التصويت"
              value={responsibilitiesInput}
              onChange={(e) => setResponsibilitiesInput(e.target.value)}
              rows={4}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm text-slate-400">الصلاحيات</label>
            <div className="grid grid-cols-2 gap-2">
              {ALL_PERMISSIONS.map((perm) => (
                <label
                  key={perm}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 hover:bg-white/10"
                >
                  <input
                    type="checkbox"
                    checked={form.permissions.includes(perm)}
                    onChange={() => togglePermission(perm)}
                    className="accent-[#0df20d]"
                  />
                  {perm}
                </label>
              ))}
            </div>
          </div>
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
        <h1 className="text-xl font-bold text-[#0df20d]">الأدوار</h1>
        {canWrite && (
          <button
            onClick={() => setMode('create')}
            className="rounded-lg bg-[#0df20d] px-4 py-2 font-bold text-slate-900 hover:bg-[#0be00b]"
          >
            + دور جديد
          </button>
        )}
      </div>
      {error && <p className="mb-4 text-red-400">{error}</p>}
      <div className="space-y-3">
        {roles.map((role) => (
          <div
            key={role.id}
            className="rounded-xl border border-white/10 bg-[#071a07] p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-white">{role.name}</p>
                <p className="text-xs text-slate-500">{role.slug}</p>
                {role.description && (
                  <p className="mt-1 text-sm text-slate-400">{role.description}</p>
                )}
                {role.permissions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {role.permissions.map((perm) => (
                      <span
                        key={perm}
                        className="rounded-full bg-[#0df20d]/10 px-2 py-0.5 text-[10px] text-[#0df20d]"
                      >
                        {perm}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {canWrite && (
                <button
                  onClick={() => handleEdit(role)}
                  className="shrink-0 rounded-lg bg-white/5 px-3 py-1.5 text-xs font-bold text-[#0df20d] hover:bg-white/10"
                >
                  تعديل
                </button>
              )}
            </div>
          </div>
        ))}
        {roles.length === 0 && (
          <p className="py-8 text-center text-slate-500">لا توجد أدوار</p>
        )}
      </div>
    </div>
  );
}
