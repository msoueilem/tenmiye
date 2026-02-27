'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Election, getElectionById, getMemberByPhone, castVote, getUserVote, Vote, UserMember } from '@/lib/firebase/queries';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export default function ElectionPortal() {
  const { id } = useParams();
  const router = useRouter();
  const [election, setElection] = useState<Election | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Identity State
  const [member, setMember] = useState<UserMember | null>(null);
  const [phoneInput, setPhoneInput] = useState('');
  const [identifying, setIdentifying] = useState(false);
  const [idError, setIdError] = useState('');

  // Voting State
  const [selections, setSelections] = useState<string[]>([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [previousVote, setPreviousVote] = useState<Vote | null>(null);
  const [isSubmitting, setIsSaving] = useState(false);
  const [votedSuccess, setVotedSuccess] = useState(false);

  useEffect(() => {
    async function load() {
      if (typeof id !== 'string') return;
      const data = await getElectionById(id);
      if (!data) {
        router.push('/elections');
        return;
      }
      setElection(data);
      
      // Check for saved member in local storage
      const savedMember = localStorage.getItem('aleradah_member');
      if (savedMember) {
        const m = JSON.parse(savedMember);
        setMember(m);
        // Check if this member already voted
        const vote = await getUserVote(id, m.id);
        if (vote) {
          setHasVoted(true);
          setPreviousVote(vote);
        }
      }
      setLoading(false);
    }
    load();
  }, [id, router]);

  const handleIdentify = async () => {
    if (!phoneInput || !election) return;
    setIdentifying(true);
    setIdError('');
    try {
      const m = await getMemberByPhone(phoneInput);
      if (m) {
        if (m.status !== 'active') {
          setIdError('عذراً، هذا الحساب غير مفعل حالياً. يرجى التواصل مع الإدارة.');
        } else {
          setMember(m);
          localStorage.setItem('aleradah_member', JSON.stringify(m));
          // Check if already voted
          const vote = await getUserVote(election.id, m.id);
          if (vote) {
            setHasVoted(true);
            setPreviousVote(vote);
          }
        }
      } else {
        setIdError('عذراً، هذا الرقم غير مسجل في قائمة الأعضاء.');
      }
    } catch (err) {
      setIdError('حدث خطأ أثناء التحقق. حاول مرة أخرى.');
    } finally {
      setIdentifying(false);
    }
  };

  const toggleSelection = (optionId: string) => {
    if (!election) return;
    if (election.type === 'nomination') {
      const max = election.maxSelections || 1;
      if (selections.includes(optionId)) {
        setSelections(selections.filter(s => s !== optionId));
      } else if (selections.length < max) {
        setSelections([...selections, optionId]);
      }
    } else {
      setSelections([optionId]);
    }
  };

  const handleCastVote = async () => {
    if (!election || !member || selections.length === 0) return;
    
    // Validation for nominations
    if (election.type === 'nomination') {
      const min = election.minSelections || 1;
      if (selections.length < min) {
        alert(`يرجى اختيار ${min} خيارات على الأقل`);
        return;
      }
    }

    if (!confirm('تأكيد: هل أنت متأكد من اختياراتك؟ لا يمكن تغيير الصوت بعد الإرسال.')) return;

    setIsSaving(true);
    try {
      const success = await castVote(election.id, member.id, selections);
      if (success) {
        setHasVoted(true);
        setVotedSuccess(true);
        // Refresh election to get new stats
        const updated = await getElectionById(election.id);
        if (updated) setElection(updated);
      } else {
        alert('حدث خطأ أثناء تسجيل صوتك. ربما قمت بالتصويت مسبقاً.');
      }
    } catch (err) {
      alert('فشل الاتصال بالخادم.');
    } finally {
      setIsSaving(false);
    }
  };

  const totalVotes = useMemo(() => {
    if (!election?.stats) return 0;
    // For 'choice' or 'yes-no', sum is correct. 
    // For 'nomination', we might want number of voters instead.
    // For simplicity, we'll just show the distribution.
    return Object.values(election.stats).reduce((a, b) => a + b, 0);
  }, [election]);

  const showResults = useMemo(() => {
    if (!election) return false;
    if (election.resultsVisibility === 'always') return true;
    if (election.resultsVisibility === 'after_close' && election.status === 'closed') return true;
    if (hasVoted && election.resultsVisibility === 'after_close') return false; // Hide until closed even if voted
    return false;
  }, [election, hasVoted]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fcf8] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#0df20d] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!election) return null;

  return (
    <div className="min-h-screen bg-[#f8fcf8] dark:bg-[#102210] flex flex-col" dir="rtl">
      <Header />
      
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12">
        {/* Election Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 text-slate-500 mb-4 text-sm font-bold">
            <span className="cursor-pointer hover:text-[#0df20d]" onClick={() => router.push('/elections')}>قائمة الانتخابات</span>
            <span className="material-symbols-outlined text-xs">chevron_left</span>
            <span className="text-slate-900 dark:text-white">قاعة التصويت</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-4">{election.title}</h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed">{election.description}</p>
        </div>

        {!member ? (
          /* Step 1: Identification */
          <div className="bg-white dark:bg-[#1a331a] rounded-3xl p-10 shadow-2xl border border-slate-100 dark:border-slate-800 text-center animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-[#0df20d]/10 text-[#0df20d] rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-4xl">fingerprint</span>
            </div>
            <h2 className="text-2xl font-black mb-2">تحقق من الهوية</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-8">يرجى إدخال رقم هاتفك المسجل للمتابعة إلى عملية التصويت.</p>
            
            <div className="max-w-sm mx-auto space-y-4">
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="00 00 00 00" 
                  className="w-full h-14 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 font-bold text-center text-xl outline-none focus:ring-4 focus:ring-[#0df20d]/10"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  dir="ltr"
                />
              </div>
              {idError && <p className="text-red-500 text-sm font-bold">{idError}</p>}
              <button 
                onClick={handleIdentify}
                disabled={identifying || !phoneInput}
                className="w-full h-14 bg-[#0df20d] text-slate-900 rounded-2xl font-black text-lg hover:bg-[#0be00b] transition-all disabled:opacity-50"
              >
                {identifying ? 'جاري التحقق...' : 'دخول'}
              </button>
            </div>
          </div>
        ) : (
          /* Step 2: Voting or Results */
          <div className="space-y-10 animate-in fade-in duration-500">
            {votedSuccess && (
              <div className="p-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-3xl flex items-center gap-4 text-green-700 dark:text-green-400 animate-in slide-in-from-top">
                <span className="material-symbols-outlined text-3xl">task_alt</span>
                <p className="font-black text-lg">تم تسجيل صوتك بنجاح! شكراً لمشاركتك.</p>
              </div>
            )}

            {hasVoted ? (
              <div className="bg-white dark:bg-[#1a331a] rounded-3xl p-8 border border-slate-100 dark:border-slate-800 shadow-xl">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined">how_to_vote</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-black">لقد قمت بالتصويت مسبقاً</h3>
                    <p className="text-slate-500 text-sm">مرحباً {member.name}، صوتك محفوظ بأمان في النظام.</p>
                  </div>
                </div>

                {!showResults && (
                  <div className="p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center">
                    <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">lock_clock</span>
                    <p className="text-slate-500 font-bold">سيتم عرض نتائج التصويت بعد إغلاق العملية الانتخابية.</p>
                  </div>
                )}
              </div>
            ) : election.status !== 'active' ? (
              <div className="bg-white dark:bg-[#1a331a] rounded-3xl p-10 text-center border border-slate-100 dark:border-slate-800">
                <span className="material-symbols-outlined text-6xl text-slate-200 mb-4 block">event_busy</span>
                <h3 className="text-2xl font-black mb-2">التصويت مغلق</h3>
                <p className="text-slate-500">انتهت الفترة المخصصة للتصويت في هذه العملية.</p>
              </div>
            ) : (
              /* Voting Interface */
              <div className="space-y-8">
                <div className="flex justify-between items-end">
                  <h3 className="text-2xl font-black">اختر من القائمة التالية:</h3>
                  {election.type === 'nomination' && (
                    <span className="bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full text-xs font-black border border-blue-100">
                      اختر ما بين {election.minSelections} و {election.maxSelections} خيارات
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {election.options.map((opt) => {
                    const isSelected = selections.includes(opt.id);
                    return (
                      <div 
                        key={opt.id} 
                        onClick={() => toggleSelection(opt.id)}
                        className={`group relative p-6 rounded-3xl border-2 cursor-pointer transition-all ${
                          isSelected 
                          ? 'bg-[#0df20d]/5 border-[#0df20d] shadow-lg shadow-[#0df20d]/10' 
                          : 'bg-white dark:bg-[#1a331a] border-slate-100 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-6">
                          <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 bg-slate-100 border border-slate-100">
                            {opt.photoUrl ? (
                              <img src={opt.photoUrl} alt={opt.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300">
                                <span className="material-symbols-outlined text-3xl">person</span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="text-xl font-black text-slate-900 dark:text-white mb-1">{opt.name}</h4>
                            <p className="text-xs text-slate-500 font-bold">مرشح / خيار</p>
                          </div>
                          <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                            isSelected ? 'bg-[#0df20d] border-[#0df20d] text-slate-900' : 'border-slate-200 text-transparent'
                          }`}>
                            <span className="material-symbols-outlined text-[20px] font-black">check</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-8 border-t border-slate-200 dark:border-slate-800">
                  <button 
                    onClick={handleCastVote}
                    disabled={isSubmitting || selections.length === 0}
                    className="w-full h-16 bg-[#0df20d] text-slate-900 rounded-2xl font-black text-xl hover:bg-[#0be00b] shadow-xl shadow-[#0df20d]/20 transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? 'جاري إرسال صوتك...' : 'تأكيد وإرسال التصويت'}
                  </button>
                </div>
              </div>
            )}

            {/* Results Display */}
            {showResults && (
              <div className="bg-white dark:bg-[#1a331a] rounded-3xl p-8 border border-slate-100 dark:border-slate-800 shadow-xl mt-12 animate-in slide-in-from-bottom">
                <div className="flex items-center justify-between mb-8 border-b border-slate-100 dark:border-slate-800 pb-6">
                  <h3 className="text-2xl font-black">نتائج التصويت الحالية</h3>
                  <div className="flex items-center gap-2 text-slate-500 font-bold">
                    <span className="material-symbols-outlined">group</span>
                    <span>{totalVotes} صوت مسجل</span>
                  </div>
                </div>

                <div className="space-y-8">
                  {election.options.map((opt) => {
                    const votes = election.stats?.[opt.id] || 0;
                    const percent = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;
                    return (
                      <div key={opt.id} className="space-y-3">
                        <div className="flex justify-between items-center text-sm font-black">
                          <span className="text-slate-900 dark:text-white">{opt.name}</span>
                          <span className="text-[#0df20d]">{percent.toFixed(1)}% ({votes})</span>
                        </div>
                        <div className="h-4 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-l from-[#0df20d] to-[#0be00b] transition-all duration-1000" 
                            style={{ width: `${percent}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
