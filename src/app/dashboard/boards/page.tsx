'use client';

import { useEffect, useState } from 'react';
import { useMemberAuth } from '@/context/MemberAuthContext';
import type { Board, CreateBoardDto } from '@/types/boards';
import { getBoards, createBoard, updateBoard } from '@/features/boards/api.client';

type Mode = 'list' | 'create' | 'edit';

const emptyForm = (): CreateBoardDto => ({
  name: '',
  description: '',
  termStartDate: '',
  termEndDate: '',
  status: 'upcoming',
});

export default function MemberBoardsPage() {
  const { user } = useMemberAuth();
  const canWrite = user?.permissions.includes('MANAGE_BOARDS') ?? false;

  const [boards, setBoards] = useState<Board[]>([]);
  const [mode, setMode] = useState<Mode>('list');
  const [editing, setEditing] = useState<Board | null>(null);
  const [form, setForm] = useState<CreateBoardDto>(emptyForm());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getBoards().then(setBoards).catch(() => setError('فشل تحميل المجالس'));
  }, []);

  const resetForm = () => {
    setForm(emptyForm());
    setEditing(null);
    setMode('list');
    setError('');
  };

  const handleEdit = (board: Board) => {
    if (!canWrite) return;
    setEditing(board);
    setForm({
      name: board.name,
      description: board.description ?? '',
      termStartDate: board.termStartDate,
      termEndDate: board.termEndDate,
      status: board.status ?? 'upcoming',
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
        const updated = await updateBoard(editing.id, form);
        setBoards((prev) => prev.map((b) => (b.id === editing.id ? updated : b)));
      } else {
        const created = await createBoard(form);
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
      <div className="max-w-2xl" dir="rtl">
        <h1 className="mb-6 text-xl font-bold text-[#0df20d]">
          {mode === 'edit' ? 'تعديل المجلس' : 'إضافة مجلس جديد'}
        </h1>
        {error && <p className="mb-4 text-red-400">{error}</p>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#0df20d]/30"
            placeholder="اسم المجلس"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            required
          />
          <textarea
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#0df20d]/30"
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
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#0df20d]/30"
                value={form.termStartDate}
                onChange={(e) => setForm((p) => ({ ...p, termStartDate: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-400">تاريخ الانتهاء</label>
              <input
                type="date"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#0df20d]/30"
                value={form.termEndDate}
                onChange={(e) => setForm((p) => ({ ...p, termEndDate: e.target.value }))}
                required
              />
            </div>
          </div>
          <select
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#0df20d]/30"
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
        <h1 className="text-xl font-bold text-[#0df20d]">مجالس الإدارة</h1>
        {canWrite && (
          <button
            onClick={() => setMode('create')}
            className="rounded-lg bg-[#0df20d] px-4 py-2 font-bold text-slate-900 hover:bg-[#0be00b]"
          >
            + إضافة مجلس
          </button>
        )}
      </div>
      {error && <p className="mb-4 text-red-400">{error}</p>}
      <div className="space-y-3">
        {boards.map((board) => (
          <div
            key={board.id}
            className="flex items-center justify-between rounded-lg border border-[#0df20d]/20 bg-white/5 p-4"
          >
            <div>
              <p className="font-semibold text-white">{board.name}</p>
              <p className="text-sm text-slate-400">
                {board.termStartDate?.slice(0, 10)} — {board.termEndDate?.slice(0, 10)}
              </p>
            </div>
            {canWrite && (
              <button
                onClick={() => handleEdit(board)}
                className="text-sm text-[#0df20d] hover:underline"
              >
                تعديل
              </button>
            )}
          </div>
        ))}
        {boards.length === 0 && (
          <p className="py-8 text-center text-slate-500">لا توجد مجالس</p>
        )}
      </div>
    </div>
  );
}
