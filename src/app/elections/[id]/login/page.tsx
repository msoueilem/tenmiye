'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getMemberByPhone, getElectionById, Election, UserMember } from '@/lib/firebase/queries';

export default function ElectionLoginPage() {
  const { id } = useParams();
  const router = useRouter();
  const [election, setElection] = useState<Election | null>(null);
  
  // Step 1: Phone, Step 2: Auth Choice/Password/OTP
  const [step, setStep] = useState<'phone' | 'auth'>('phone');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [member, setMember] = useState<UserMember | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      if (typeof id !== 'string') return;
      const data = await getElectionById(id);
      if (!data) router.push('/elections');
      else setElection(data);
    }
    load();
  }, [id, router]);

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length < 8) return;
    setLoading(true);
    setError('');
    const m = await getMemberByPhone(phone);
    if (m) {
      if (m.status !== 'active') {
        setError('هذا الحساب غير مفعل. يرجى التواصل مع الإدارة.');
      } else if (m.votedElections?.includes(id as string)) {
        setError('لقد قمت بالتصويت في هذه الانتخابات مسبقاً. لا يمكن التصويت أكثر من مرة.');
      } else {
        setMember(m);
        setStep('auth');
      }
    } else {
      setError('رقم الهاتف غير مسجل في قائمة الأعضاء.');
    }
    setLoading(false);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;
    
    setLoading(true);
    if (member.password) {
      if (password === member.password) { // Simple check for now, should be secure later
        proceedToProfile();
      } else {
        setError('كلمة المرور غير صحيحة');
      }
    } else {
      // Logic for OTP would go here. For now, we allow entering '1234' as OTP
      if (password === '1234') {
        proceedToProfile();
      } else {
        setError('رمز التحقق غير صحيح (استخدم 1234 للتجربة)');
      }
    }
    setLoading(false);
  };

  const proceedToProfile = () => {
    sessionStorage.setItem(`voter_session_${id}`, JSON.stringify(member));
    router.push(`/elections/${id}/profile`);
  };

  if (!election) return null;

  return (
    <div className="min-h-screen bg-[#f5f8f5] dark:bg-[#102210] flex items-center justify-center p-6" dir="rtl">
      <div className="w-full max-w-lg bg-white dark:bg-[#1a331a] rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800">
        <div className="p-8 sm:p-12">
          <div className="flex justify-center mb-8">
            <div className="size-16 rounded-2xl bg-[#0df20d]/10 text-[#0df20d] flex items-center justify-center">
              <span className="material-symbols-outlined text-4xl">how_to_vote</span>
            </div>
          </div>

          <div className="text-center mb-10">
            <h1 className="text-3xl font-black mb-2">{election.title}</h1>
            <p className="text-slate-500">بوابة التحقق الآمن للمصوتين</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold border border-red-100 flex items-center gap-3">
              <span className="material-symbols-outlined text-lg">error</span>
              {error}
            </div>
          )}

          {step === 'phone' ? (
            <form onSubmit={handlePhoneSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">رقم الهاتف الموريتاني</label>
                <div className="relative group">
                  <input
                    className="w-full h-14 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 pr-12 text-left font-black text-xl outline-none focus:ring-4 focus:ring-[#0df20d]/10 transition-all"
                    type="tel"
                    placeholder="xx xx xx xx"
                    dir="ltr"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    maxLength={8}
                    required
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 group-focus-within:text-[#0df20d]">call</span>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading || phone.length < 8}
                className="w-full h-14 bg-[#0df20d] text-slate-900 rounded-2xl font-black text-lg hover:bg-[#0be00b] transition-all shadow-lg shadow-[#0df20d]/20 disabled:opacity-50"
              >
                {loading ? 'جاري التحقق...' : 'متابعة'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleAuth} className="space-y-6">
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 mb-6 text-center">
                <p className="text-xs text-slate-500 mb-1">أهلاً بك</p>
                <p className="font-black text-lg">{member?.name}</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  {member?.password ? 'كلمة المرور' : 'رمز التحقق (OTP)' }
                </label>
                <input
                  className="w-full h-14 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 text-center font-black text-xl outline-none focus:ring-4 focus:ring-[#0df20d]/10"
                  type={member?.password ? 'password' : 'text'}
                  placeholder={member?.password ? '••••••••' : '0000'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                {!member?.password && (
                  <p className="mt-3 text-center text-xs text-slate-500">سيصلك الرمز عبر تطبيق الواتساب قريباً</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !password}
                className="w-full h-14 bg-[#0df20d] text-slate-900 rounded-2xl font-black text-lg hover:bg-[#0be00b] transition-all shadow-lg shadow-[#0df20d]/20 disabled:opacity-50"
              >
                {loading ? 'جاري التحقق...' : 'دخول وقسم اليمين'}
              </button>
              
              <button 
                type="button" 
                onClick={() => setStep('phone')} 
                className="w-full text-sm text-slate-400 font-bold hover:text-slate-600"
              >
                تغيير رقم الهاتف
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
