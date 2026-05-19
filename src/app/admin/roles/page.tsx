'use client';

import { useEffect, useState } from 'react';
import type { Role, CreateRoleDto } from '@/types/roles';
import { apiFetch } from '@/lib/api';

type Mode = 'list' | 'create' | 'edit';

const ALL_PERMISSIONS = [
  'MANAGE_USERS',
  'MANAGE_REGISTRATIONS',
  'MANAGE_BOARDS',
  'MANAGE_ACCESS',
  'MANAGE_ELECTIONS',
  'MANAGE_PAYMENT_CHANNELS',
  'RECORD_CONTRIBUTIONS',
  'VERIFY_CONTRIBUTIONS',
  'RECORD_EXPENSES',
  'WRITE_BLOG',
  'MODERATE_BLOG',
  'READ_FINANCE',
  'READ_ALL',
  'MANAGE_SETTINGS',
] as const;

const getRoles = (): Promise<Role[]> => apiFetch('GET', '/roles', { tokenType: 'admin' });
const createRole = (dto: CreateRoleDto): Promise<Role> => apiFetch('POST', '/roles', { body: dto, tokenType: 'admin' });
const updateRole = (id: string, dto: Partial<CreateRoleDto>): Promise<Role> => apiFetch('PATCH', `/roles/${id}`, { body: dto, tokenType: 'admin' });
const deleteRole = (id: string): Promise<void> => apiFetch('DELETE', `/roles/${id}`, { tokenType: 'admin' });

const emptyForm = (): CreateRoleDto => ({
  name: '',
  slug: '',
  description: '',
  responsibilities: [],
  permissions: [],
});

export default function AdminRolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [mode, setMode] = useState<Mode>('list');
  const [editing, setEditing] = useState<Role | null>(null);
  const [form, setForm] = useState<CreateRoleDto>(emptyForm());
  const [responsibilitiesInput, setResponsibilitiesInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getRoles().then(setRoles).catch(() => setError('فشل تحميل الأدوار'));
  }, []);

  const resetForm = () => {
    setForm(emptyForm());
    setResponsibilitiesInput('');
    setEditing(null);
    setMode('list');
    setError('');
  };

  const handleEdit = (role: Role) => {
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

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الدور؟')) return;
    setLoading(true);
    try {
      await deleteRole(id);
      setRoles((prev) => prev.filter((r) => r.id !== id));
    } catch {
      setError('فشل الحذف');
    } finally {
      setLoading(false);
    }
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
    setLoading(true);
    setError('');
    const responsibilities = responsibilitiesInput.split('\n').map((r) => r.trim()).filter(Boolean);
    const payload = { ...form, responsibilities };
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
      setLoading(false);
    }
  };

  if (mode === 'create' || mode === 'edit') {
    return (
      <div className="p-6 max-w-2xl mx-auto" dir="rtl">
        <h1 className="text-xl font-bold text-[#d4af37] mb-6">
          {mode === 'edit' ? 'تعديل الدور' : 'دور جديد'}
        </h1>
        {error && <p className="text-red-400 mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#d4af37]/30"
            placeholder="اسم الدور"
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
            <label className="mb-1 block text-sm text-slate-400">المسؤوليات (سطر لكل مسؤولية)</label>
            <textarea
              className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#d4af37]/30"
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
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800"
                >
                  <input
                    type="checkbox"
                    checked={form.permissions.includes(perm)}
                    onChange={() => togglePermission(perm)}
                    className="accent-[#d4af37]"
                  />
                  {perm}
                </label>
              ))}
            </div>
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
        <h1 className="text-xl font-bold text-[#d4af37]">الأدوار</h1>
        <button
          onClick={() => setMode('create')}
          className="rounded-lg bg-[#d4af37] px-4 py-2 font-bold text-slate-900 hover:bg-[#c9a227]"
        >
          + دور جديد
        </button>
      </div>
      {error && <p className="mb-4 text-red-400">{error}</p>}
      <div className="space-y-3">
        {roles.map((role) => (
          <div
            key={role.id}
            className="flex items-start justify-between rounded-lg border border-[#d4af37]/20 bg-white/5 p-4"
          >
            <div>
              <p className="font-semibold text-white">{role.name}</p>
              <p className="text-sm text-slate-400">{role.slug}</p>
              {role.description && (
                <p className="mt-1 text-sm text-slate-500">{role.description}</p>
              )}
              {role.permissions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {role.permissions.map((perm) => (
                    <span
                      key={perm}
                      className="rounded-full bg-[#d4af37]/10 px-2 py-0.5 text-[10px] text-[#d4af37]"
                    >
                      {perm}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleEdit(role)}
                className="text-sm text-[#d4af37] hover:underline"
              >
                تعديل
              </button>
              <button
                onClick={() => handleDelete(role.id)}
                disabled={loading}
                className="text-sm text-red-400 hover:underline disabled:opacity-50"
              >
                حذف
              </button>
            </div>
          </div>
        ))}
        {roles.length === 0 && (
          <p className="py-8 text-center text-slate-500">لا توجد أدوار حتى الآن</p>
        )}
      </div>
    </div>
  );
}
