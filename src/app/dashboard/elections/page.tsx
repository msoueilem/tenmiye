'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Election, getAllElections, createElection, updateElection, deleteElection, uploadImage, ElectionOption, UserMember } from '@/lib/firebase/queries';
import { useDashboard } from '@/context/DashboardContext';
import { CandidatePicker } from './components/CandidatePicker';

export default function ElectionsManagementPage() {
  const { admin } = useDashboard();
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isResultsModalOpen, setIsResultsModalOpen] = useState(false);
  const [selectedElection, setSelectedElection] = useState<Election | null>(null);
  
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Form State
  const initialForm: Omit<Election, 'id' | 'createdAt'> = {
    title: '',
    description: '',
    type: 'choice',
    status: 'draft',
    resultsVisibility: 'after_close',
    startTime: '',
    endTime: '',
    options: [],
    minSelections: 1,
    maxSelections: 1
  };
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchElections();
  }, []);

  async function fetchElections() {
    setLoading(true);
    const data = await getAllElections();
    setElections(data);
    setLoading(false);
  }

  const handleOpenModal = (election: Election | null = null) => {
    setMessage(null);
    if (election) {
      setEditingId(election.id);
      const formatDate = (ts: any) => {
        if (!ts) return '';
        const d = ts.toDate ? ts.toDate() : new Date(ts);
        // Convert to local time string YYYY-MM-DDTHH:mm
        const tzOffset = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
      };
      setForm({ 
        ...election,
        startTime: formatDate(election.startTime),
        endTime: formatDate(election.endTime)
      });
    } else {
      setEditingId(null);
      setForm(initialForm);
    }
    setIsModalOpen(true);
  };

  const handleOpenResults = (election: Election) => {
    setSelectedElection(election);
    setIsResultsModalOpen(true);
  };

  const calculateTotalVotes = (stats?: { [key: string]: number }) => {
    if (!stats) return 0;
    return Object.values(stats).reduce((a, b) => a + b, 0);
  };

  const handleAddCandidate = (member: UserMember) => {
    if (form.options.find(o => o.id === member.id)) return;
    setForm({ 
      ...form, 
      options: [...form.options, { id: member.id, name: member.name, photoUrl: member.photoUrl }] 
    });
  };

  const handleRemoveOption = (index: number) => {
    const updated = [...form.options];
    updated.splice(index, 1);
    setForm({ ...form, options: updated });
  };

  const validateDates = () => {
    const start = new Date(form.startTime);
    const end = new Date(form.endTime);
    const now = new Date();
    const oneMonthFromNow = new Date();
    oneMonthFromNow.setMonth(now.getMonth() + 1);

    // Give 2-minute buffer for "now"
    if (start.getTime() < (now.getTime() - 120000) && !editingId) return 'يجب أن يكون تاريخ البدء في المستقبل (بعد الوقت الحالي)';
    if (end <= start) return 'يجب أن يكون تاريخ الانتهاء بعد تاريخ البدء';
    if (start > oneMonthFromNow) return 'لا يمكن جدولة انتخابات لأكثر من شهر في المستقبل';
    return null;
  };

  const handleSave = async () => {
    setIsSaving(true);
    if (!form.title || (form.type !== 'nomination' && form.options.length < 2)) {
      setMessage({ type: 'error', text: 'يرجى إكمال البيانات الأساسية' });
      setIsSaving(false);
      return;
    }

    const dateError = validateDates();
    if (dateError) {
      setMessage({ type: 'error', text: dateError });
      setIsSaving(false);
      return;
    }

    try {
      const finalData = {
        ...form,
        startTime: new Date(form.startTime),
        endTime: new Date(form.endTime)
      };

      if (editingId) {
        await updateElection(editingId, finalData);
      } else {
        await createElection(finalData);
      }
      setIsModalOpen(false);
      fetchElections();
      setMessage({ type: 'success', text: 'تم حفظ الانتخابات بنجاح' });
    } catch (err) {
      setMessage({ type: 'error', text: 'حدث خطأ أثناء الحفظ' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الانتخابات؟')) return;
    await deleteElection(id);
    fetchElections();
  };

  const updateStatus = async (id: string, status: Election['status']) => {
    await updateElection(id, { status });
    fetchElections();
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#0df20d] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div className="flex flex-col gap-1">
          <h2 className="text-slate-900 dark:text-white text-3xl font-bold tracking-tight">إدارة الانتخابات</h2>
          <p className="text-slate-500 dark:text-slate-400 text-base">إنشاء وإدارة عمليات التصويت والترشيحات</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-[#0df20d] hover:bg-[#0be00b] text-slate-900 font-bold py-2.5 px-5 rounded-lg shadow-sm transition-all"
        >
          <span className="material-symbols-outlined">add</span>
          <span>إنشاء عملية تصويت</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {elections.map((e) => (
          <div key={e.id} className="bg-white dark:bg-[#1a331a] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                e.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' :
                e.status === 'closed' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {e.status === 'active' ? 'نشط' : e.status === 'closed' ? 'مغلق' : 'مسودة'}
              </span>
              <div className="flex gap-1">
                <button onClick={() => handleOpenModal(e)} className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"><span className="material-symbols-outlined text-[20px]">edit</span></button>
                <button onClick={() => handleDelete(e.id)} className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"><span className="material-symbols-outlined text-[20px]">delete</span></button>
              </div>
            </div>
            <h3 className="text-xl font-bold mb-2 line-clamp-1">{e.title}</h3>
            <p className="text-sm text-slate-500 mb-6 line-clamp-2 h-10">{e.description}</p>
            
            <div className="mt-auto space-y-3">
              <div className="flex justify-between text-xs text-slate-400 border-t pt-3 border-slate-100 dark:border-slate-800">
                <span>{e.type === 'choice' ? 'اختيار' : e.type === 'yes-no' ? 'نعم/لا' : 'ترشيحات'}</span>
                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-xs">schedule</span> 
                  {e.endTime?.toDate ? e.endTime.toDate().toLocaleDateString('ar-MR') : ''}
                </span>
              </div>
              
              <div className="flex gap-2">
                {e.status === 'draft' && (
                  <button onClick={() => updateStatus(e.id, 'active')} className="flex-1 py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700">إطلاق</button>
                )}
                {e.status === 'active' && (
                  <button onClick={() => updateStatus(e.id, 'closed')} className="flex-1 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700">إغلاق</button>
                )}
                {e.status === 'closed' && (
                  <button onClick={() => updateStatus(e.id, 'active')} className="flex-1 py-2 bg-slate-600 text-white rounded-lg text-xs font-bold">إعادة فتح</button>
                )}
                <button onClick={() => handleOpenResults(e)} className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg flex items-center justify-center"><span className="material-symbols-outlined text-[18px]">bar_chart</span></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Election Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1a331a] w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 flex justify-between items-center">
              <h3 className="font-black text-xl">{editingId ? 'تعديل الانتخابات' : 'إنشاء عملية تصويت'}</h3>
              <button onClick={() => { setIsModalOpen(false); setMessage(null); }} className="text-slate-400 hover:text-slate-600"><span className="material-symbols-outlined">close</span></button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[75vh] space-y-8">
              {message && (
                <div className={`p-4 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-2 duration-300 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                  <span className="material-symbols-outlined">{message.type === 'success' ? 'check_circle' : 'error'}</span>
                  <p className="font-bold text-sm">{message.text}</p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="font-bold border-b pb-2 text-[#0df20d]">المعلومات الأساسية</h4>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">عنوان التصويت</label>
                    <input className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-[#0df20d]/20" type="text" value={form.title || ''} onChange={e => setForm({...form, title: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">وصف موجز</label>
                    <textarea className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-[#0df20d]/20" rows={3} value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">تاريخ البدء</label>
                      <input className="w-full px-3 py-2 border rounded-lg text-xs" type="datetime-local" value={form.startTime || ''} onChange={e => setForm({...form, startTime: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">تاريخ الانتهاء</label>
                      <input className="w-full px-3 py-2 border rounded-lg text-xs" type="datetime-local" value={form.endTime || ''} onChange={e => setForm({...form, endTime: e.target.value})} />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-bold border-b pb-2 text-[#0df20d]">القواعد والظهور</h4>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">نوع التصويت</label>
                    <select className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none" value={form.type || 'choice'} onChange={e => {
                      const type = e.target.value as Election['type'];
                      let options = form.options;
                      if (type === 'yes-no') {
                        options = [{ id: 'yes', name: 'نعم' }, { id: 'no', name: 'لا' }];
                      }
                      setForm({...form, type, options});
                    }}>
                      <option value="choice">اختيار (واحد أو متعدد)</option>
                      <option value="yes-no">نعم / لا</option>
                      <option value="nomination">نظام الترشيحات (بحث)</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">أقل عدد للاختيار</label>
                      <input className="w-full px-3 py-2 border rounded-lg" type="number" value={form.minSelections || 1} onChange={e => setForm({...form, minSelections: parseInt(e.target.value) || 1})}/>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">أقصى عدد للاختيار</label>
                      <input className="w-full px-3 py-2 border rounded-lg" type="number" value={form.maxSelections || 1} onChange={e => setForm({...form, maxSelections: parseInt(e.target.value) || 1})}/>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">ظهور النتائج</label>
                    <select className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none" value={form.resultsVisibility || 'after_close'} onChange={e => setForm({...form, resultsVisibility: e.target.value as Election['resultsVisibility']})}>
                      <option value="always">علني: متاح للجميع دائماً</option>
                      <option value="after_close">علني: متاح للجميع بعد الإغلاق</option>
                      <option value="admin_always">خاص: للمدراء فقط دائماً</option>
                      <option value="admin_after_close">خاص: للمدراء فقط بعد الإغلاق</option>
                    </select>
                  </div>
                </div>
              </div>

              {form.type !== 'yes-no' && (
                <div className="space-y-4">
                  <h4 className="font-bold border-b pb-2 text-[#0df20d]">إدارة الخيارات / المرشحين</h4>
                  <div className="max-w-md">
                    <p className="text-[10px] text-slate-500 mb-2">أضف مرشحين من قائمة الأعضاء (يجب توفر صورة ملف شخصي):</p>
                    <CandidatePicker onSelect={handleAddCandidate} excludeIds={form.options.map(o => o.id)} />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {form.options.map((opt, idx) => (
                      <div key={opt.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 group">
                        <img src={opt.photoUrl} className="w-10 h-10 rounded-full object-cover shrink-0" alt="" />
                        <span className="flex-1 text-sm font-bold">{opt.name}</span>
                        <button onClick={() => handleRemoveOption(idx)} className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800 flex gap-3">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 h-11 bg-[#0df20d] text-slate-900 rounded-lg font-bold hover:bg-[#0be00b] shadow-lg shadow-[#0df20d]/20 transition-all disabled:opacity-50"
              >
                {isSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
              </button>
              <button onClick={() => setIsModalOpen(false)} className="px-8 h-11 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold hover:bg-slate-50 transition-all">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Results Modal */}
      {isResultsModalOpen && selectedElection && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1a331a] w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 flex justify-between items-center">
              <h3 className="font-black text-xl flex items-center gap-2">
                <span className="material-symbols-outlined text-[#0df20d]">analytics</span>
                نتائج التصويت: {selectedElection.title}
              </h3>
              <button onClick={() => setIsResultsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
              <div className="flex justify-between items-center text-sm font-bold text-slate-500">
                <span>إجمالي الأصوات المسجلة:</span>
                <span className="text-slate-900 dark:text-white">{calculateTotalVotes(selectedElection.stats)}</span>
              </div>
              <div className="space-y-6">
                {selectedElection.options.map(opt => {
                  const votes = selectedElection.stats?.[opt.id] || 0;
                  const total = calculateTotalVotes(selectedElection.stats);
                  const percent = total > 0 ? (votes / total) * 100 : 0;
                  return (
                    <div key={opt.id} className="space-y-2">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <div className="flex items-center gap-2">
                          {opt.photoUrl && <img src={opt.photoUrl} className="w-6 h-6 rounded-full object-cover" alt="" />}
                          <span>{opt.name}</span>
                        </div>
                        <span>{percent.toFixed(1)}% ({votes})</span>
                      </div>
                      <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-[#0df20d] transition-all duration-500" style={{ width: `${percent}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800">
              <button onClick={() => setIsResultsModalOpen(false)} className="w-full h-11 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold hover:bg-slate-50 transition-all">إغلاق</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
