'use client';

import React, { useState, useEffect } from 'react';
import { Election, BackendElectionType, BackendElectionStatus, ElectionResults } from '@/types/elections';
import {
  getAllElections,
  createElectionApi,
  updateElectionApi,
  deleteElectionApi,
  getElectionResults,
  advanceElectionApi,
} from '@/features/elections/api.client';

type ElectionForm = {
  title: string;
  description: string;
  type: BackendElectionType;
  seatsCount: string;
  multiOptions: string[];
};

const EMPTY_FORM: ElectionForm = {
  title: '',
  description: '',
  type: 'yes_no',
  seatsCount: '3',
  multiOptions: ['', ''],
};

function typeLabel(type: BackendElectionType): string {
  if (type === 'yes_no') return 'استفتاء نعم / لا';
  if (type === 'multiple_choice') return 'اختيار متعدد';
  return 'انتخابات مجلس';
}

function statusLabel(status: BackendElectionStatus): string {
  if (status === 'voting') return 'تصويت';
  if (status === 'completed') return 'مكتمل';
  if (status === 'cancelled') return 'ملغي';
  if (status === 'draft') return 'مسودة';
  if (status === 'nomination') return 'ترشيح';
  if (status === 'dismissal') return 'إقصاء';
  return status;
}

function statusColors(status: BackendElectionStatus): string {
  if (status === 'voting') return 'bg-green-50 text-green-700 border-green-200';
  if (status === 'draft') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (status === 'nomination' || status === 'dismissal') return 'bg-blue-50 text-blue-700 border-blue-200';
  return 'bg-slate-100 text-slate-600 border-slate-200';
}

function nextStatus(status: BackendElectionStatus, type: BackendElectionType): 'nomination' | 'dismissal' | 'voting' | 'completed' | null {
  if (status === 'draft') return type === 'board' ? 'nomination' : 'voting';
  if (status === 'nomination') return 'dismissal';
  if (status === 'dismissal') return 'voting';
  if (status === 'voting') return 'completed';
  return null;
}

export default function ElectionsManagementPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ElectionForm>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  const [resultsElection, setResultsElection] = useState<Election | null>(null);
  const [results, setResults] = useState<ElectionResults | null>(null);
  const [resultsLoading, setResultsLoading] = useState(false);

  useEffect(() => { void fetchElections(); }, []);

  async function fetchElections() {
    setLoading(true);
    setFetchError('');
    const result = await getAllElections();
    if (result === null) {
      setFetchError('تعذّر تحميل الانتخابات. تحقق من الاتصال بالخادم.');
    } else {
      setElections(result);
    }
    setLoading(false);
  }

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setMessage(null);
    setIsModalOpen(true);
  }

  function openEdit(e: Election) {
    setEditingId(e.id);
    setForm({
      title: e.title,
      description: e.description ?? '',
      type: e.type,
      seatsCount: String(e.boardConfig?.seatsCount ?? 3),
      multiOptions: e.options?.map((o) => o.label) ?? ['', ''],
    });
    setMessage(null);
    setIsModalOpen(true);
  }

  async function openResults(e: Election) {
    setResultsElection(e);
    setResultsLoading(true);
    setResults(await getElectionResults(e.id));
    setResultsLoading(false);
  }

  function setOption(index: number, value: string) {
    setForm((p) => {
      const next = [...p.multiOptions];
      next[index] = value;
      return { ...p, multiOptions: next };
    });
  }

  async function handleSave() {
    if (!form.title.trim()) {
      setMessage({ type: 'error', text: 'يرجى ملء عنوان الانتخابات' });
      return;
    }

    setIsSaving(true);

    if (editingId) {
      const res = await updateElectionApi(editingId, {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        type: form.type,
      });
      if (!res.ok) setMessage({ type: 'error', text: res.error ?? 'حدث خطأ أثناء التعديل' });
      else { setIsModalOpen(false); void fetchElections(); }
    } else {
      type Payload = Parameters<typeof createElectionApi>[0];
      const payload: Payload = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        type: form.type,
      };

      if (form.type === 'yes_no') {
        payload.options = [{ id: 'yes', label: 'نعم' }, { id: 'no', label: 'لا' }];
      } else if (form.type === 'multiple_choice') {
        const labels = form.multiOptions.map((o) => o.trim()).filter(Boolean);
        if (labels.length < 2) {
          setMessage({ type: 'error', text: 'أدخل خيارين على الأقل' });
          setIsSaving(false);
          return;
        }
        payload.options = labels.map((label, i) => ({ id: `opt-${i + 1}`, label }));
      } else {
        const seats = parseInt(form.seatsCount, 10);
        if (isNaN(seats) || seats < 1) {
          setMessage({ type: 'error', text: 'عدد المقاعد يجب أن يكون رقماً صحيحاً موجباً' });
          setIsSaving(false);
          return;
        }
        payload.boardConfig = { seatsCount: seats };
      }

      const res = await createElectionApi(payload);
      if (!res) setMessage({ type: 'error', text: 'حدث خطأ أثناء الإنشاء' });
      else { setIsModalOpen(false); void fetchElections(); }
    }

    setIsSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('هل أنت متأكد من حذف هذه الانتخابات؟')) return;
    await deleteElectionApi(id);
    void fetchElections();
  }

  async function handleAdvance(e: Election) {
    const target = nextStatus(e.status, e.type);
    if (!target) return;
    await advanceElectionApi(e.id, target);
    void fetchElections();
  }

  async function handleCancel(id: string) {
    await advanceElectionApi(id, 'cancelled');
    void fetchElections();
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#0df20d] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h2 className="text-slate-900 dark:text-white text-3xl font-bold tracking-tight">إدارة الانتخابات</h2>
          <p className="text-slate-500 dark:text-slate-400 text-base">إنشاء وإدارة عمليات التصويت</p>
        </div>
        <button
          onClick={openCreate}
          className="flex cursor-pointer items-center gap-2 bg-[#0df20d] hover:bg-[#0be00b] text-slate-900 font-bold py-2.5 px-5 rounded-lg shadow-sm transition-all"
        >
          <span className="material-symbols-outlined">add</span>
          إنشاء عملية تصويت
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {elections.map((e) => {
          const advance = nextStatus(e.status, e.type);
          return (
            <div key={e.id} className="bg-white dark:bg-[#1a331a] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusColors(e.status)}`}>
                  {statusLabel(e.status)}
                </span>
                <div className="flex gap-1">
                  {e.status === 'draft' && (
                    <button onClick={() => openEdit(e)} className="cursor-pointer p-1.5 text-slate-400 hover:text-blue-600 transition-colors">
                      <span className="material-symbols-outlined text-[20px]">edit</span>
                    </button>
                  )}
                  <button onClick={() => void handleDelete(e.id)} className="cursor-pointer p-1.5 text-slate-400 hover:text-red-600 transition-colors">
                    <span className="material-symbols-outlined text-[20px]">delete</span>
                  </button>
                </div>
              </div>

              <h3 className="text-xl font-bold mb-1 line-clamp-1">{e.title}</h3>
              <p className="text-xs text-slate-400 mb-1">{typeLabel(e.type)}</p>
              <p className="text-sm text-slate-500 mb-6 line-clamp-2 h-10">{e.description}</p>

              <div className="mt-auto space-y-3">
                <div className="flex gap-2 border-t pt-3 border-slate-100 dark:border-slate-800">
                  {advance && e.status !== 'cancelled' && (
                    <button onClick={() => void handleAdvance(e)} className="flex-1 cursor-pointer py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700">
                      {e.status === 'draft' ? (e.type === 'board' ? 'بدء الترشيح' : 'بدء التصويت') :
                       e.status === 'nomination' ? 'الانتقال للإقصاء' :
                       e.status === 'dismissal' ? 'بدء التصويت' : 'إنهاء'}
                    </button>
                  )}
                  {e.status !== 'completed' && e.status !== 'cancelled' && (
                    <button onClick={() => void handleCancel(e.id)} className="flex-1 cursor-pointer py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700">
                      إلغاء
                    </button>
                  )}
                  <button onClick={() => void openResults(e)} className="cursor-pointer px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px]">bar_chart</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {fetchError && (
          <div className="col-span-full py-20 text-center text-red-500 font-medium">{fetchError}</div>
        )}
        {!fetchError && elections.length === 0 && (
          <div className="col-span-full py-20 text-center text-slate-400">لا توجد عمليات تصويت.</div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1a331a] w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 flex justify-between items-center">
              <h3 className="font-black text-xl">{editingId ? 'تعديل الانتخابات' : 'إنشاء عملية تصويت'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="cursor-pointer text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto max-h-[65vh]">
              {message && (
                <div className={`p-3 rounded-lg text-sm font-bold border ${message.type === 'success' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                  {message.text}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">عنوان التصويت *</label>
                <input
                  className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-[#0df20d]/20"
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">وصف موجز</label>
                <textarea
                  className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-[#0df20d]/20"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">نوع التصويت</label>
                <select
                  className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as BackendElectionType })}
                  disabled={!!editingId}
                >
                  <option value="yes_no">استفتاء نعم / لا</option>
                  <option value="multiple_choice">اختيار متعدد</option>
                  <option value="board">انتخابات مجلس الإدارة</option>
                </select>
              </div>

              {!editingId && form.type === 'multiple_choice' && (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-500">الخيارات (2 على الأقل) *</label>
                  {form.multiOptions.map((opt, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none"
                        placeholder={`الخيار ${i + 1}`}
                        value={opt}
                        onChange={(e) => setOption(i, e.target.value)}
                      />
                      {form.multiOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => setForm((p) => ({ ...p, multiOptions: p.multiOptions.filter((_, j) => j !== i) }))}
                          className="cursor-pointer px-3 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-400 hover:text-red-500"
                        >×</button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, multiOptions: [...p.multiOptions, ''] }))}
                    className="cursor-pointer text-xs text-slate-400 hover:text-slate-600 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5"
                  >+ إضافة خيار</button>
                </div>
              )}

              {!editingId && form.type === 'board' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">عدد المقاعد *</label>
                  <input
                    type="number"
                    min="1"
                    className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
                    value={form.seatsCount}
                    onChange={(e) => setForm({ ...form, seatsCount: e.target.value })}
                  />
                </div>
              )}
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800 flex gap-3">
              <button
                onClick={() => void handleSave()}
                disabled={isSaving}
                className="flex-1 h-11 cursor-pointer bg-[#0df20d] text-slate-900 rounded-lg font-bold hover:bg-[#0be00b] shadow-lg shadow-[#0df20d]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'جاري الحفظ...' : 'حفظ'}
              </button>
              <button onClick={() => setIsModalOpen(false)} className="cursor-pointer px-8 h-11 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold hover:bg-slate-50 transition-all">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results Modal */}
      {resultsElection && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1a331a] w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 flex justify-between items-center">
              <h3 className="font-black text-xl flex items-center gap-2">
                <span className="material-symbols-outlined text-[#0df20d]">analytics</span>
                نتائج: {resultsElection.title}
              </h3>
              <button onClick={() => setResultsElection(null)} className="cursor-pointer text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {resultsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-4 border-[#0df20d] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : !results || results.results.length === 0 ? (
                <p className="text-center text-slate-400 py-8">لا توجد أصوات بعد.</p>
              ) : (
                <>
                  <p className="text-sm font-bold text-slate-500">
                    إجمالي الأصوات: {results.results.reduce((s, r) => s + r.count, 0)}
                  </p>
                  {results.results.map((r) => {
                    const total = results.results.reduce((s, x) => s + x.count, 0);
                    const pct = total > 0 ? (r.count / total) * 100 : 0;
                    return (
                      <div key={r.selection} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="truncate max-w-xs">{r.selection}</span>
                          <span>{pct.toFixed(1)}% ({r.count})</span>
                        </div>
                        <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-[#0df20d] transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800">
              <button onClick={() => setResultsElection(null)} className="w-full cursor-pointer h-11 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold hover:bg-slate-50 transition-all">
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
