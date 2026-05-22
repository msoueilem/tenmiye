'use client';

import { useEffect, useState } from 'react';
import type { Board, CreateBoardDto } from '@/types/boards';
import { getBoards, createBoard, updateBoard, deleteBoard } from '@/features/boards/api.client';

type Mode = 'list' | 'create' | 'edit';

const emptyForm = (): CreateBoardDto => ({
  name: '',
  description: '',
  termStartDate: '',
  termEndDate: '',
  status: 'upcoming',
});

export default function AdminBoardsPage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [mode, setMode] = useState<Mode>('list');
  const [editing, setEditing] = useState<Board | null>(null);
  const [form, setForm] = useState<CreateBoardDto>(emptyForm());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getBoards('admin').then(setBoards).catch(() => setError('فشل تحميل المجالس'));
  }, []);

  const resetForm = () => {
    setForm(emptyForm());
    setEditing(null);
    setMode('list');
    setError('');
  };

  const handleEdit = (board: Board) => {
    setEditing(board);
    setForm({
      name: board.name,
      description: board.description ?? '',
      termStartDate: board.termStartDate?.slice(0, 10) ?? '',
      termEndDate: board.termEndDate?.slice(0, 10) ?? '',
      status: board.status ?? 'upcoming',
    });
    setMode('edit');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المجلس؟')) return;
    setLoading(true);
    try {
      await deleteBoard(id);
      setBoards((prev) => prev.filter((b) => b.id !== id));
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
        const updated = await updateBoard(editing.id, form, 'admin');
        setBoards((prev) => prev.map((b) => (b.id === editing.id ? updated : b)));
      } else {
        const created = await createBoard(form, 'admin');
        setBoards((prev) => [...prev, created]);
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
          {mode === 'edit' ? 'تعديل المجلس' : 'إضافة مجلس جديد'}
        </h1>
        {error && <p className="text-red-400 mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#d4af37]/30"
            placeholder="اسم المجلس"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            required
          />
          <textarea
            className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#d4af37]/30"
            placeholder="الوصف (اختياري)"
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            rows={3}
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm text-slate-400">تاريخ البدء</label>
              <input
                type="date"
                className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#d4af37]/30"
                value={form.termStartDate}
                onChange={(e) => setForm((p) => ({ ...p, termStartDate: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-400">تاريخ الانتهاء</label>
              <input
                type="date"
                className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#d4af37]/30"
                value={form.termEndDate}
                onChange={(e) => setForm((p) => ({ ...p, termEndDate: e.target.value }))}
                required
              />
            </div>
          </div>
          <select
            className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#d4af37]/30"
            value={form.status}
            onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as Board['status'] }))}
          >
            <option value="upcoming">قادم</option>
            <option value="active">نشط</option>
            <option value="archived">مؤرشف</option>
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
        <h1 className="text-xl font-bold text-[#d4af37]">مجالس الإدارة</h1>
        <button
          onClick={() => setMode('create')}
          className="rounded-lg bg-[#d4af37] px-4 py-2 font-bold text-slate-900 hover:bg-[#c9a227]"
        >
          + إضافة مجلس
        </button>
      </div>
      {error && <p className="mb-4 text-red-400">{error}</p>}
      <div className="space-y-3">
        {boards.map((board) => (
          <div
            key={board.id}
            className="flex items-center justify-between rounded-lg border border-[#d4af37]/20 bg-white/5 p-4"
          >
            <div>
              <p className="font-semibold text-white">{board.name}</p>
              <p className="text-sm text-slate-400">
                {board.termStartDate?.slice(0, 10)} — {board.termEndDate?.slice(0, 10)}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleEdit(board)}
                className="text-sm text-[#d4af37] hover:underline"
              >
                تعديل
              </button>
              <button
                onClick={() => handleDelete(board.id)}
                disabled={loading}
                className="text-sm text-red-400 hover:underline disabled:opacity-50"
              >
                حذف
              </button>
            </div>
          </div>
        ))}
        {boards.length === 0 && (
          <p className="py-8 text-center text-slate-500">لا توجد مجالس حتى الآن</p>
        )}
      </div>
    </div>
  );
}
