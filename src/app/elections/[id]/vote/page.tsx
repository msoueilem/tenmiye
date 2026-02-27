'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Election, getElectionById, castVote, getUserVote, UserMember, searchMembers } from '@/lib/firebase/queries';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export default function ElectionVotingPage() {
  const { id } = useParams();
  const router = useRouter();
  const [election, setElection] = useState<Election | null>(null);
  const [member, setMember] = useState<UserMember | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [selections, setSelections] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Nomination Search State
  const [nomineeQueries, setNomineeQueries] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<{ [index: number]: UserMember[] }>({});
  const [searchLoading, setSearchLoading] = useState<{ [index: number]: boolean }>({});

  useEffect(() => {
    const session = sessionStorage.getItem(`voter_session_${id}`);
    if (!session) {
      router.push(`/elections/${id}/login`);
      return;
    }
    const m = JSON.parse(session) as UserMember;
    setMember(m);

    async function load() {
      if (typeof id !== 'string') return;
      const data = await getElectionById(id);
      if (!data) {
        router.push('/elections');
        return;
      }
      
      // Check if already voted
      const vote = await getUserVote(id, m.id);
      if (vote) {
        router.push(`/elections/${id}/thanks`);
        return;
      }

      if (data.type === 'nomination') {
        const count = data.maxSelections || 1;
        setNomineeQueries(new Array(count).fill(''));
        setSelections(new Array(count).fill(''));
      }
      setElection(data);
      setLoading(false);
    }
    load();
  }, [id, router]);

  const handleSearch = async (index: number, query: string) => {
    const updatedQueries = [...nomineeQueries];
    updatedQueries[index] = query;
    setNomineeQueries(updatedQueries);

    if (query.length < 2) {
      setSearchResults(prev => ({ ...prev, [index]: [] }));
      return;
    }

    setSearchLoading(prev => ({ ...prev, [index]: true }));
    try {
      const results = await searchMembers(query);
      setSearchResults(prev => ({ ...prev, [index]: results }));
    } catch (err: any) {
      console.error('Nomination search error:', err);
      let errorMsg = 'حدث خطأ أثناء البحث عن الأعضاء.';
      if (err.message && err.message.includes('index')) {
        errorMsg += '\n\nيتطلب هذا البحث إنشاء فهرس في Firebase. يرجى مراجعة وحدة تحكم الإدارة.';
      }
      alert(errorMsg);
      setSearchResults(prev => ({ ...prev, [index]: [] }));
    } finally {
      setSearchLoading(prev => ({ ...prev, [index]: false }));
    }
  };

  const selectNominee = (index: number, nominee: UserMember) => {
    // Check if already selected in another slot
    if (selections.filter((s, i) => i !== index).includes(nominee.id)) {
      alert('تم اختيار هذا العضو مسبقاً في خانة أخرى');
      return;
    }

    const updatedSelections = [...selections];
    updatedSelections[index] = nominee.id;
    setSelections(updatedSelections);

    const updatedQueries = [...nomineeQueries];
    updatedQueries[index] = nominee.name;
    setNomineeQueries(updatedQueries);

    setSearchResults(prev => ({ ...prev, [index]: [] }));
  };

  const toggleChoice = (optionId: string) => {
    if (!election) return;
    if (election.type === 'nomination') return;

    if (election.maxSelections && election.maxSelections > 1) {
      if (selections.includes(optionId)) {
        setSelections(selections.filter(s => s !== optionId));
      } else if (selections.length < election.maxSelections) {
        setSelections([...selections, optionId]);
      }
    } else {
      setSelections([optionId]);
    }
  };

  const handleVote = async () => {
    if (!election || !member) return;
    
    const finalSelections = selections.filter(s => s !== '');
    
    if (finalSelections.length === 0) {
      alert('يرجى تحديد اختيار واحد على الأقل');
      return;
    }

    if (election.minSelections && finalSelections.length < election.minSelections) {
      alert(`يرجى تحديد ${election.minSelections} خيارات على الأقل`);
      return;
    }

    setShowConfirmModal(true);
  };

  const confirmAndCastVote = async () => {
    if (!election || !member) return;
    const finalSelections = selections.filter(s => s !== '');
    
    setIsSubmitting(true);
    setShowConfirmModal(false);
    try {
      const success = await castVote(election.id, member.id, finalSelections);
      if (success) {
        sessionStorage.removeItem(`voter_session_${election.id}`);
        router.push(`/elections/${election.id}/thanks`);
      } else {
        alert('حدث خطأ أثناء تسجيل صوتك.');
      }
    } catch (err) {
      alert('فشل الاتصال بالخادم.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !election || !member) {
    return (
      <div className="min-h-screen bg-[#f8fcf8] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#0df20d] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fcf8] dark:bg-[#102210] flex flex-col" dir="rtl">
      <Header />
      
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12">
        <div className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">{election.title}</h1>
            <p className="text-slate-500">مرحباً {member.name}، يرجى ملء ورقة الاقتراع بعناية.</p>
          </div>
          <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-2xl border border-blue-100 dark:border-blue-800 text-xs font-black">
            {election.type === 'choice' ? 'تصويت خيارات' : election.type === 'yes-no' ? 'استفتاء' : 'نموذج ترشيح'}
          </div>
        </div>

        <div className="bg-white dark:bg-[#1a331a] rounded-3xl p-8 shadow-xl border border-slate-100 dark:border-slate-800">
          {/* Nomination UI */}
          {election.type === 'nomination' ? (
            <div className="space-y-8">
              <div className="p-4 bg-[#0df20d]/5 rounded-2xl border border-[#0df20d]/10 mb-8">
                <p className="text-sm font-bold text-[#0df20d] text-center">يرجى البحث عن الأعضاء المطلوب ترشيحهم (من {election.minSelections} إلى {election.maxSelections})</p>
              </div>
              
              <div className="grid grid-cols-1 gap-6">
                {nomineeQueries.map((query, index) => (
                  <div key={index} className="space-y-2 relative">
                    <label className="text-xs font-black text-slate-400 uppercase">المرشح رقم {index + 1}</label>
                    <div className="relative group">
                      <input
                        className={`w-full h-14 rounded-2xl px-6 pr-12 font-bold outline-none transition-all ${
                          selections[index] 
                          ? 'bg-green-50 border-2 border-green-500 text-green-700' 
                          : 'bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 focus:ring-4 focus:ring-[#0df20d]/10'
                        }`}
                        placeholder="ابحث بالاسم أو رقم الهاتف..."
                        value={query}
                        onChange={(e) => handleSearch(index, e.target.value)}
                      />
                      <span className={`absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined ${selections[index] ? 'text-green-500' : 'text-slate-400'}`}>
                        {selections[index] ? 'check_circle' : 'search'}
                      </span>
                      {selections[index] && (
                        <button 
                          onClick={() => {
                            const upS = [...selections]; upS[index] = ''; setSelections(upS);
                            const upQ = [...nomineeQueries]; upQ[index] = ''; setNomineeQueries(upQ);
                          }}
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500"
                        >
                          <span className="material-symbols-outlined text-[20px]">close</span>
                        </button>
                      )}
                    </div>

                    {/* Results Dropdown */}
                    {searchResults[index] && searchResults[index].length > 0 && (
                      <div className="absolute top-full right-0 mt-2 w-full bg-white dark:bg-[#1a331a] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                        <ul className="max-h-60 overflow-y-auto py-2">
                          {searchResults[index].map((res) => (
                            <li key={res.id}>
                              <button
                                onClick={() => selectNominee(index, res)}
                                className="w-full flex items-center gap-4 px-6 py-4 text-right hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
                              >
                                <img src={res.photoUrl} className="w-10 h-10 rounded-full object-cover shrink-0" alt="" />
                                <div className="flex flex-col">
                                  <span className="font-bold text-slate-900 dark:text-white">{res.name}</span>
                                  <span className="text-xs text-slate-500" dir="ltr">{res.phoneNumber}</span>
                                </div>
                                <span className="mr-auto material-symbols-outlined text-slate-200 group-hover:text-[#0df20d]">add_circle</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : election.type === 'yes-no' ? (
            /* Yes/No UI */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-10">
              {election.options.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setSelections([opt.id])}
                  className={`group relative flex flex-col items-center justify-center gap-6 p-10 rounded-3xl border-4 transition-all duration-300 hover:scale-[1.02] ${
                    selections.includes(opt.id)
                    ? (opt.id === 'yes' ? 'bg-green-50 border-green-500 shadow-xl shadow-green-500/10' : 'bg-red-50 border-red-500 shadow-xl shadow-red-500/10')
                    : 'bg-slate-50 dark:bg-slate-900/50 border-transparent border-slate-100 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className={`size-24 rounded-full flex items-center justify-center transition-all ${
                    selections.includes(opt.id)
                    ? (opt.id === 'yes' ? 'bg-green-500 text-white' : 'bg-red-500 text-white')
                    : (opt.id === 'yes' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600')
                  }`}>
                    <span className="material-symbols-outlined text-6xl">{opt.id === 'yes' ? 'check' : 'close'}</span>
                  </div>
                  <div className="text-center">
                    <span className="text-3xl font-black block mb-1">{opt.name}</span>
                    <span className="text-sm text-slate-500 font-bold">{opt.id === 'yes' ? 'أوافق على القرار' : 'أرفض القرار'}</span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            /* Selection UI (Single/Multi) */
            <div className="space-y-8">
              <div className="flex justify-between items-end mb-6">
                <h3 className="text-xl font-black">المرشحون المتاحون:</h3>
                {election.maxSelections && election.maxSelections > 1 && (
                  <span className="text-xs font-bold text-slate-400">يمكنك اختيار حتى {election.maxSelections} مرشحين</span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {election.options.map((opt) => {
                  const isSelected = selections.includes(opt.id);
                  return (
                    <div 
                      key={opt.id} 
                      onClick={() => toggleChoice(opt.id)}
                      className={`group relative flex flex-col p-4 rounded-3xl border-2 cursor-pointer transition-all ${
                        isSelected 
                        ? 'bg-[#0df20d]/5 border-[#0df20d] shadow-lg shadow-[#0df20d]/10 scale-[1.02]' 
                        : 'bg-slate-50 dark:bg-slate-900/50 border-transparent hover:border-slate-200'
                      }`}
                    >
                      <div className="aspect-square w-full rounded-2xl overflow-hidden mb-4 bg-slate-200">
                        {opt.photoUrl ? (
                          <img src={opt.photoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400"><span className="material-symbols-outlined text-4xl">person</span></div>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2 px-2">
                        <span className="font-black text-slate-900 dark:text-white truncate">{opt.name}</span>
                        <div className={`size-6 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
                          isSelected ? 'bg-[#0df20d] border-[#0df20d] text-slate-900' : 'border-slate-300'
                        }`}>
                          {isSelected && <span className="material-symbols-outlined text-[16px] font-black">check</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={handleVote}
              disabled={isSubmitting || selections.filter(s => s !== '').length === 0}
              className="w-full h-16 bg-[#0df20d] text-slate-900 rounded-2xl font-black text-xl hover:bg-[#0be00b] shadow-xl shadow-[#0df20d]/30 transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'جاري تسجيل صوتك...' : 'تأكيد وإرسال التصويت'}
            </button>
            <p className="mt-4 text-center text-xs text-slate-400 font-bold flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-[14px]">lock</span>
              صوتك مشفر ومحفوظ بسرية تامة
            </p>
          </div>
        </div>
      </main>

      <Footer />

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1a331a] w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 text-center">
              <div className="size-20 bg-[#0df20d]/10 text-[#0df20d] rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="material-symbols-outlined text-5xl">verified</span>
              </div>
              <h3 className="text-2xl font-black mb-4">تأكيد اختيارك</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                أنت على وشك إرسال صوتك. <br/>
                <span className="font-bold text-red-500 underline">لا يمكنك</span> تغيير أو تعديل اختيارك بعد الإرسال. هل تريد المتابعة؟
              </p>
              
              <div className="flex flex-col gap-3">
                <button
                  onClick={confirmAndCastVote}
                  className="w-full h-14 bg-[#0df20d] text-slate-900 rounded-2xl font-black text-lg hover:bg-[#0be00b] shadow-xl shadow-[#0df20d]/20 transition-all"
                >
                  نعم، أرسل صوتي الآن
                </button>
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="w-full h-14 bg-slate-50 dark:bg-slate-900/50 text-slate-500 font-bold rounded-2xl hover:bg-slate-100 transition-all"
                >
                  تراجع وتعديل
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
