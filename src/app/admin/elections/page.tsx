'use client';

import React, { useState, useEffect } from 'react';
import { BackendElection, BackendElectionType, BackendElectionStatus, ElectionResults } from '@/types/elections';
import {
  getAllElections,
  createElectionApi,
  updateElectionApi,
  deleteElectionApi,
  getElectionResults,
} from '@/features/elections/api.client';
import { useMemberAuth } from '@/context/MemberAuthContext';

type ElectionForm = {
  title: string;
  description: string;
  type: BackendElectionType;
  startTime: string;
  endTime: string;
};

const EMPTY_FORM: ElectionForm = {
  title: '',
  description: '',
  type: 'general_vote',
  startTime: '',
  endTime: '',
};

function typeLabel(type: BackendElectionType): string {
  if (type === 'general_vote') return 'استفتاء';
  if (type === 'board_election') return 'انتخابات مجلس الإدارة';
  return 'انتخابات لجنة';
}

function statusLabel(status: BackendElectionStatus): string {
  if (status === 'active') return 'نشط';
  if (status === 'completed') return 'مكتمل';
  if (status === 'cancelled') return 'ملغي';
  return 'معلّق';
}

function statusColors(status: BackendElectionStatus): string {
  if (status === 'active') return 'bg-green-50 text-green-700 border-green-200';
  if (status === 'pending') return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-slate-100 text-slate-600 border-slate-200';
}

export default function ElectionsManagementPage() {
  const { getAccessToken } = useMemberAuth();
  const [elections, setElections] = useState<BackendElection[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ElectionForm>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  const [resultsElection, setResultsElection] = useState<BackendElection | null>(null);
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

  function openEdit(e: BackendElection) {
    setEditingId(e.id);
    setForm({
      title: e.title,
      description: e.description ?? '',
      type: e.type,
      startTime: e.startTime ? e.startTime.slice(0, 16) : '',
      endTime: e.endTime ? e.endTime.slice(0, 16) : '',
    });
    setMessage(null);
    setIsModalOpen(true);
  }

  async function openResults(e: BackendElection) {
    setResultsElection(e);
    setResultsLoading(true);
    setResults(await getElectionResults(e.id));
    setResultsLoading(false);
  }

  async function handleSave() {
    if (!form.title.trim() || !form.startTime || !form.endTime) {
      setMessage({ type: 'error', text: 'يرجى ملء جميع الحقول المطلوبة' });
      return;
    }
    if (new Date(form.endTime) <= new Date(form.startTime)) {
      setMessage({ type: 'error', text: 'يجب أن يكون تاريخ الانتهاء بعد تاريخ البدء' });
      return;
    }

    setIsSaving(true);
    const token = await getAccessToken();
    if (!token) { setMessage({ type: 'error', text: 'انتهت الجلسة، يرجى تسجيل الدخول مجدداً' }); setIsSaving(false); return; }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      type: form.type,
      startTime: new Date(form.startTime).toISOString(),
      endTime: new Date(form.endTime).toISOString(),
    };

    let ok = false;
    if (editingId) {
      const res = await updateElectionApi(editingId, payload, token);
      ok = res.ok;
      if (!ok) setMessage({ type: 'error', text: res.error ?? 'حدث خطأ أثناء التعديل' });
    } else {
      const res = await createElectionApi(payload, token);
      ok = !!res;
      if (!ok) setMessage({ type: 'error', text: 'حدث خطأ أثناء الإنشاء' });
    }

    setIsSaving(false);
    if (ok) { setIsModalOpen(false); void fetchElections(); }
  }

  async function handleDelete(id: string) {
    if (!confirm('هل أنت متأكد من حذف هذه الانتخابات؟')) return;
    const token = await getAccessToken();
    if (!token) return;
    await deleteElectionApi(id, token);
    void fetchElections();
  }

  async function handleUpdateStatus(id: string, status: BackendElectionStatus) {
    const token = await getAccessToken();
    if (!token) return;
    await updateElectionApi(id, { status }, token);
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
        {elections.map((e) => (
          <div key={e.id} className="bg-white dark:bg-[#1a331a] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusColors(e.status)}`}>
                {statusLabel(e.status)}
              </span>
              <div className="flex gap-1">
                <button onClick={() => openEdit(e)} className="cursor-pointer p-1.5 text-slate-400 hover:text-blue-600 transition-colors">
                  <span className="material-symbols-outlined text-[20px]">edit</span>
                </button>
                <button onClick={() => void handleDelete(e.id)} className="cursor-pointer p-1.5 text-slate-400 hover:text-red-600 transition-colors">
                  <span className="material-symbols-outlined text-[20px]">delete</span>
                </button>
              </div>
            </div>

            <h3 className="text-xl font-bold mb-1 line-clamp-1">{e.title}</h3>
            <p className="text-xs text-slate-400 mb-1">{typeLabel(e.type)}</p>
            <p className="text-sm text-slate-500 mb-6 line-clamp-2 h-10">{e.description}</p>

            <div className="mt-auto space-y-3">
              <div className="text-xs text-slate-400 border-t pt-3 border-slate-100 dark:border-slate-800">
                {e.endTime ? new Date(e.endTime).toLocaleDateString('ar-MR') : ''}
              </div>
              <div className="flex gap-2">
                {e.status === 'pending' && (
                  <button onClick={() => void handleUpdateStatus(e.id, 'active')} className="flex-1 cursor-pointer py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700">
                    إطلاق
                  </button>
                )}
                {e.status === 'active' && (
                  <button onClick={() => void handleUpdateStatus(e.id, 'completed')} className="flex-1 cursor-pointer py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700">
                    إغلاق
                  </button>
                )}
                {e.status === 'completed' && (
                  <button onClick={() => void handleUpdateStatus(e.id, 'active')} className="flex-1 cursor-pointer py-2 bg-slate-600 text-white rounded-lg text-xs font-bold">
                    إعادة فتح
                  </button>
                )}
                <button onClick={() => void openResults(e)} className="cursor-pointer px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">bar_chart</span>
                </button>
              </div>
            </div>
          </div>
        ))}

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
                >
                  <option value="general_vote">استفتاء (نعم / لا)</option>
                  <option value="board_election">انتخابات مجلس الإدارة</option>
                  <option value="committee_election">انتخابات لجنة</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">تاريخ البدء *</label>
                  <input
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-900"
                    type="datetime-local"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">تاريخ الانتهاء *</label>
                  <input
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-900"
                    type="datetime-local"
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  />
                </div>
              </div>
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
