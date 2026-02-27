'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { UserMember, updateVoterProfile, uploadImage } from '@/lib/firebase/queries';

export default function ElectionProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const [member, setMember] = useState<UserMember | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const session = sessionStorage.getItem(`voter_session_${id}`);
    if (!session) {
      router.push(`/elections/${id}/login`);
      return;
    }
    const m = JSON.parse(session) as UserMember;
    setMember(m);
    setName(m.name);
    setPhotoUrl(m.photoUrl || '');
    setPhotoPreview(m.photoUrl || '');
    setLoading(false);
  }, [id, router]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) return;
      const url = await uploadImage(file, `members-simple/profile_${Date.now()}`);
      if (url) {
        setPhotoUrl(url);
        setPhotoPreview(url);
      }
    }
  };

  const handleSave = async () => {
    if (!member) return;
    setSaving(true);
    try {
      const updates: any = { name, photoUrl };
      if (password) updates.password = password;
      
      await updateVoterProfile(member.id, updates);
      
      // Update session
      const updatedMember = { ...member, ...updates };
      sessionStorage.setItem(`voter_session_${id}`, JSON.stringify(updatedMember));
      
      router.push(`/elections/${id}/vote`);
    } catch (err) {
      alert('حدث خطأ أثناء حفظ البيانات');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !member) return null;

  return (
    <div className="min-h-screen bg-[#f5f8f5] dark:bg-[#102210] flex flex-col items-center justify-center p-6" dir="rtl">
      <div className="w-full max-w-2xl bg-white dark:bg-[#1a331a] rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800">
        <div className="p-8 sm:p-12">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-black mb-2 text-slate-900 dark:text-white">تحديث الملف الشخصي</h1>
            <p className="text-slate-500">يرجى مراجعة وتحديث بياناتك قبل الانتقال إلى قاعة التصويت</p>
          </div>

          <div className="space-y-8">
            {/* Photo Section */}
            <div className="flex flex-col items-center gap-4">
              <div className="w-32 h-32 rounded-3xl bg-slate-100 dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden relative group shadow-sm">
                {photoPreview ? (
                  <img src={photoPreview} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-4xl text-slate-300">person</span>
                )}
                <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <span className="text-white text-[10px] font-black">تغيير الصورة</span>
                  <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                </label>
              </div>
              <p className="text-[10px] text-slate-400 font-bold">صورة الملف الشخصي (مربّعة، بحد أقصى 2MB)</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">الاسم بالكامل</label>
                <input
                  className="w-full h-12 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 font-bold outline-none focus:ring-2 focus:ring-[#0df20d]/20 transition-all"
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">كلمة المرور (اختياري)</label>
                <input
                  className="w-full h-12 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 font-bold outline-none focus:ring-2 focus:ring-[#0df20d]/20 transition-all"
                  type="password"
                  placeholder="اتركها فارغة لعدم التغيير"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex gap-4">
              <button
                onClick={handleSave}
                disabled={saving || !name}
                className="flex-1 h-14 bg-[#0df20d] text-slate-900 rounded-2xl font-black text-lg hover:bg-[#0be00b] transition-all shadow-lg shadow-[#0df20d]/20 disabled:opacity-50"
              >
                {saving ? 'جاري الحفظ...' : 'حفظ البيانات والانتقال للتصويت'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
