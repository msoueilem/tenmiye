'use client';

import { useEffect, useState } from 'react';
import type { AdminAccount, CreateAdminAccountDto, UpdateAdminAccountDto } from '@/types/admin-accounts';
import {
  getAdminAccounts,
  createAdminAccount,
  updateAdminAccount,
  deleteAdminAccount,
} from '@/features/admin-accounts/api.client';

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

const emptyCreate = (): CreateAdminAccountDto => ({
  googleEmail: '',
  userId: '',
  permissions: [],
});

export default function AdminAccountsPage() {
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [mode, setMode] = useState<Mode>('list');
  const [editing, setEditing] = useState<AdminAccount | null>(null);
  const [createForm, setCreateForm] = useState<CreateAdminAccountDto>(emptyCreate());
  const [editForm, setEditForm] = useState<UpdateAdminAccountDto>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getAdminAccounts().then(setAccounts).catch(() => setError('فشل تحميل حسابات المشرفين'));
  }, []);

  const resetForm = () => {
    setCreateForm(emptyCreate());
    setEditForm({});
    setEditing(null);
    setMode('list');
    setError('');
  };

  const handleEdit = (account: AdminAccount) => {
    setEditing(account);
    setEditForm({ permissions: account.permissions, status: account.status });
    setMode('edit');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المشرف؟')) return;
    setLoading(true);
    try {
      await deleteAdminAccount(id);
      setAccounts((prev) => prev.filter((a) => a.id !== id));
    } catch {
      setError('فشل الحذف');
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (perm: string, current: string[], setter: (p: string[]) => void) => {
    setter(current.includes(perm) ? current.filter((p) => p !== perm) : [...current, perm]);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const created = await createAdminAccount({
        ...createForm,
        userId: createForm.userId || undefined,
      });
      const newAccount: AdminAccount = {
        id: created.id,
        googleEmail: createForm.googleEmail,
        userId: createForm.userId || undefined,
        permissions: createForm.permissions,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setAccounts((prev) => [...prev, newAccount]);
      resetForm();
    } catch {
      setError('فشل إنشاء الحساب');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setLoading(true);
    setError('');
    try {
      await updateAdminAccount(editing.id, editForm);
      setAccounts((prev) =>
        prev.map((a) => (a.id === editing.id ? { ...a, ...editForm } : a)),
      );
      resetForm();
    } catch {
      setError('فشل تحديث الحساب');
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'create') {
    return (
      <div className="p-6 max-w-2xl mx-auto" dir="rtl">
        <h1 className="text-xl font-bold text-[#d4af37] mb-6">إضافة مشرف جديد</h1>
        {error && <p className="text-red-400 mb-4">{error}</p>}
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <input
            type="email"
            className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#d4af37]/30"
            placeholder="البريد الإلكتروني (Google)"
            value={createForm.googleEmail}
            onChange={(e) => setCreateForm((p) => ({ ...p, googleEmail: e.target.value }))}
            required
          />
          <input
            className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#d4af37]/30"
            placeholder="معرّف العضو المرتبط (اختياري)"
            value={createForm.userId}
            onChange={(e) => setCreateForm((p) => ({ ...p, userId: e.target.value }))}
          />
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
                    checked={createForm.permissions.includes(perm)}
                    onChange={() =>
                      togglePermission(perm, createForm.permissions, (perms) =>
                        setCreateForm((p) => ({ ...p, permissions: perms })),
                      )
                    }
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
              {loading ? 'جاري الحفظ...' : 'إضافة'}
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

  if (mode === 'edit' && editing) {
    return (
      <div className="p-6 max-w-2xl mx-auto" dir="rtl">
        <h1 className="text-xl font-bold text-[#d4af37] mb-2">تعديل صلاحيات المشرف</h1>
        <p className="text-sm text-slate-400 mb-6">{editing.googleEmail}</p>
        {error && <p className="text-red-400 mb-4">{error}</p>}
        <form onSubmit={handleUpdate} className="flex flex-col gap-4">
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
                    checked={(editForm.permissions ?? []).includes(perm)}
                    onChange={() =>
                      togglePermission(perm, editForm.permissions ?? [], (perms) =>
                        setEditForm((p) => ({ ...p, permissions: perms })),
                      )
                    }
                    className="accent-[#d4af37]"
                  />
                  {perm}
                </label>
              ))}
            </div>
          </div>
          <select
            className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#d4af37]/30"
            value={editForm.status ?? 'active'}
            onChange={(e) =>
              setEditForm((p) => ({ ...p, status: e.target.value as 'active' | 'inactive' }))
            }
          >
            <option value="active">نشط</option>
            <option value="inactive">معطّل</option>
          </select>
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
        <h1 className="text-xl font-bold text-[#d4af37]">حسابات المشرفين</h1>
        <button
          onClick={() => setMode('create')}
          className="rounded-lg bg-[#d4af37] px-4 py-2 font-bold text-slate-900 hover:bg-[#c9a227]"
        >
          + إضافة مشرف
        </button>
      </div>
      {error && <p className="mb-4 text-red-400">{error}</p>}
      <div className="space-y-3">
        {accounts.map((account) => (
          <div
            key={account.id}
            className="flex items-start justify-between rounded-lg border border-[#d4af37]/20 bg-white/5 p-4"
          >
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-white">{account.googleEmail}</p>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    account.status === 'active'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-slate-500/20 text-slate-400'
                  }`}
                >
                  {account.status === 'active' ? 'نشط' : 'معطّل'}
                </span>
              </div>
              {account.permissions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {account.permissions.map((perm) => (
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
                onClick={() => handleEdit(account)}
                className="text-sm text-[#d4af37] hover:underline"
              >
                تعديل
              </button>
              <button
                onClick={() => handleDelete(account.id)}
                disabled={loading}
                className="text-sm text-red-400 hover:underline disabled:opacity-50"
              >
                حذف
              </button>
            </div>
          </div>
        ))}
        {accounts.length === 0 && (
          <p className="py-8 text-center text-slate-500">لا توجد حسابات مشرفين</p>
        )}
      </div>
    </div>
  );
}
