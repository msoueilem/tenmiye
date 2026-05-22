'use client';

import React, { useEffect, useRef, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api';

interface MeProfile {
  id: string;
  fullName: string;
  fullNameAr: string | null;
  fullNameFr: string | null;
  phoneNumber: string;
  whatsappNumber: string;
  city: string | null;
  region: string | null;
  status: string;
  profilePictureId: string | null;
  profilePictureUrl: string | null;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

function Avatar({
  url,
  name,
  onUpload,
  uploading,
}: {
  url: string | null;
  name: string;
  onUpload: (file: File) => void;
  uploading: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('');

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-[#0df20d]/30 bg-[#0b3d0b]">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-[#0df20d]">
              {initials}
            </div>
          )}
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          type="button"
          className="absolute -bottom-1 -left-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-[#0df20d] text-[#071a07] shadow-lg transition hover:bg-[#0df20d]/80 disabled:opacity-50"
          aria-label="تغيير الصورة"
        >
          {uploading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#071a07] border-t-transparent" />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          )}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          e.target.value = '';
        }}
      />
      <p className="text-xs text-slate-500">JPEG · PNG · WebP · حتى 5 MB</p>
    </div>
  );
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<MeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveError, setSaveError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const data = await apiFetch<MeProfile>('GET', '/me', { tokenType: 'member' });
        if (mounted) {
          setProfile(data);
          setPhotoUrl(data.profilePictureUrl);
        }
      } catch { /* stay on loading spinner if it fails */ }
      finally { if (mounted) setLoading(false); }
    }
    void load();
    return () => { mounted = false; };
  }, []);

  async function handlePhotoUpload(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const { id, url } = await apiFetch<{ id: string; url: string }>('POST', '/me/profile-picture', {
        formData: form,
        tokenType: 'member',
      });
      setPhotoUrl(url);
      setProfile((prev) => prev ? { ...prev, profilePictureId: id } : prev);
    } catch (e: unknown) {
      setSaveError(e instanceof ApiError ? e.message : 'فشل رفع الصورة.');
      setSaveStatus('error');
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaveStatus('saving');
    setSaveError('');

    const fd = new FormData(e.currentTarget);
    const body: Record<string, string> = {};
    (['fullName', 'fullNameAr', 'fullNameFr', 'city', 'region'] as const).forEach((k) => {
      const v = (fd.get(k) as string).trim();
      if (v) body[k] = v;
    });

    try {
      await apiFetch('PATCH', '/me', { body, tokenType: 'member' });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch (e: unknown) {
      setSaveError(e instanceof ApiError ? e.message : 'حدث خطأ أثناء الحفظ.');
      setSaveStatus('error');
    }
  }

  const inputCls = 'h-11 w-full rounded-lg border border-white/15 bg-white/5 px-4 text-white placeholder-white/25 focus:border-[#0df20d]/50 focus:ring-1 focus:ring-[#0df20d]/50 focus:outline-none transition-colors';
  const labelCls = 'block text-sm font-medium text-slate-400 mb-1';
  const readonlyCls = 'h-11 flex items-center px-4 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-sm';

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0df20d] border-t-transparent" />
      </div>
    );
  }

  if (!profile) {
    return <p className="text-red-400">تعذّر تحميل الملف الشخصي.</p>;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-white">الملف الشخصي</h1>

      <div className="rounded-2xl border border-white/10 bg-[#071a07] p-6 md:p-8">
        <div className="mb-8 flex justify-center">
          <Avatar url={photoUrl} name={profile.fullName} onUpload={handlePhotoUpload} uploading={uploading} />
        </div>

        {/* Read-only fields */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className={labelCls}>رقم الهاتف</p>
            <div className={readonlyCls} dir="ltr">+222 {profile.phoneNumber}</div>
          </div>
          <div>
            <p className={labelCls}>رقم الواتساب</p>
            <div className={readonlyCls} dir="ltr">+222 {profile.whatsappNumber}</div>
          </div>
          <div>
            <p className={labelCls}>الحالة</p>
            <div className={readonlyCls}>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                profile.status === 'active'
                  ? 'bg-[#0df20d]/15 text-[#0df20d]'
                  : profile.status === 'pending'
                  ? 'bg-yellow-500/15 text-yellow-400'
                  : 'bg-red-500/15 text-red-400'
              }`}>
                {profile.status === 'active' ? 'نشط' : profile.status === 'pending' ? 'قيد المراجعة' : 'موقوف'}
              </span>
            </div>
          </div>
        </div>

        <hr className="mb-6 border-white/10" />

        {/* Editable fields */}
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="fullName" className={labelCls}>
                الاسم الكامل <span className="text-red-400">*</span>
              </label>
              <input id="fullName" name="fullName" required defaultValue={profile.fullName ?? ''} className={inputCls} type="text" />
            </div>
            <div>
              <label htmlFor="fullNameAr" className={labelCls}>الاسم بالعربية</label>
              <input id="fullNameAr" name="fullNameAr" defaultValue={profile.fullNameAr ?? ''} className={inputCls} type="text" />
            </div>
            <div>
              <label htmlFor="fullNameFr" className={labelCls}>الاسم بالفرنسية</label>
              <input id="fullNameFr" name="fullNameFr" defaultValue={profile.fullNameFr ?? ''} className={inputCls} type="text" dir="ltr" />
            </div>
            <div>
              <label htmlFor="city" className={labelCls}>المدينة</label>
              <input id="city" name="city" defaultValue={profile.city ?? ''} className={inputCls} type="text" />
            </div>
            <div>
              <label htmlFor="region" className={labelCls}>الولاية</label>
              <input id="region" name="region" defaultValue={profile.region ?? ''} className={inputCls} type="text" />
            </div>
          </div>

          {saveStatus === 'error' && <p className="text-sm text-red-400">{saveError}</p>}
          {saveStatus === 'saved' && <p className="text-sm text-[#0df20d]">✓ تم حفظ التغييرات</p>}

          <div className="flex justify-start">
            <button
              type="submit"
              disabled={saveStatus === 'saving'}
              className="h-11 cursor-pointer rounded-lg bg-[#0df20d] px-10 font-bold text-[#071a07] transition hover:bg-[#0df20d]/80 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saveStatus === 'saving' ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
