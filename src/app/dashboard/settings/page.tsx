'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { PublicLandingData, getPublicLandingData, updatePublicLandingData, uploadImage, Initiative } from '@/lib/firebase/queries';
import { useDashboard } from '@/context/DashboardContext';

type MessageTarget = 'global' | 'logo' | 'favicon' | 'aspect' | 'initiative-modal' | 'stats' | 'achievements' | 'contact';

export default function SettingsPage() {
  const { user, admin } = useDashboard();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<PublicLandingData | null>(null);
  const [initialData, setInitialData] = useState<PublicLandingData | null>(null);
  
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);

  const [newAchievement, setNewAchievement] = useState('');

  // Initiatives State
  const [isInitiativeModalOpen, setIsInitiativeModalOpen] = useState(false);
  const [editingInitiativeIndex, setEditingInitiativeIndex] = useState<number | null>(null);
  const [initiativeForm, setInitiativeForm] = useState<Initiative>({ title: '', description: '', imageUrl: '' });
  const [initiativeImageFile, setInitiativeFormImageFile] = useState<File | null>(null);
  const [initiativeImagePreview, setInitiativeFormImagePreview] = useState<string | null>(null);

  // Current Aspect State
  const [aspectImageFile, setAspectImageFile] = useState<File | null>(null);
  const [aspectImagePreview, setAspectImagePreview] = useState<string | null>(null);

  // New Modals State
  const [achievementToDelete, setAchievementToDelete] = useState<number | null>(null);
  const [isSaveSummaryOpen, setIsSaveSummaryOpen] = useState(false);
  const [changesReport, setChangesReport] = useState<string[]>([]);

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string; target: MessageTarget } | null>(null);

  // Auto-clear messages
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  useEffect(() => {
    async function fetchData() {
      try {
        const landingData = await getPublicLandingData();
        if (landingData) {
          setData(landingData);
          setInitialData(landingData);
          if (landingData.logoUrl) setLogoPreview(landingData.logoUrl);
          if (landingData.faviconUrl) setFaviconPreview(landingData.faviconUrl);
          if (landingData.currentAspect?.imageUrl) setAspectImagePreview(landingData.currentAspect.imageUrl);
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const hasChanges = useMemo(() => {
    if (!data || !initialData) return false;
    if (logoFile || faviconFile || aspectImageFile) return true;
    return JSON.stringify(data) !== JSON.stringify(initialData);
  }, [data, initialData, logoFile, faviconFile, aspectImageFile]);

  // Validation Helpers
  const validateImage = (file: File, type: 'square' | 'vertical', target: MessageTarget): Promise<boolean> => {
    return new Promise((resolve) => {
      if (file.size > 2 * 1024 * 1024) {
        setMessage({ 
          type: 'error', 
          target,
          text: `حجم الملف (${(file.size / 1024 / 1024).toFixed(2)}MB) يتجاوز الحد (2MB).` 
        });
        resolve(false);
        return;
      }

      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        if (type === 'square' && img.width !== img.height) {
          setMessage({ 
            type: 'error', 
            target,
            text: `يجب أن تكون الصورة مربعة (1:1). المقاس الحالي: ${img.width}x${img.height}.` 
          });
          resolve(false);
        } else if (type === 'vertical' && img.height <= img.width) {
          setMessage({ 
            type: 'error', 
            target,
            text: `يجب أن تكون الصورة مستطيلة عمودياً. المقاس الحالي: ${img.width}x${img.height}.` 
          });
          resolve(false);
        } else {
          resolve(true);
        }
      };
      img.onerror = () => {
        setMessage({ type: 'error', target, text: 'فشل في قراءة ملف الصورة.' });
        resolve(false);
      };
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'favicon' | 'initiative' | 'aspect') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validationType = (type === 'aspect') ? 'vertical' : 'square';
      const target: MessageTarget = type === 'initiative' ? 'initiative-modal' : type;
      const isValid = await validateImage(file, validationType, target);
      e.target.value = '';
      if (!isValid) return;

      if (type === 'logo') {
        setLogoFile(file);
        setLogoPreview(URL.createObjectURL(file));
      } else if (type === 'favicon') {
        setFaviconFile(file);
        setFaviconPreview(URL.createObjectURL(file));
      } else if (type === 'initiative') {
        setInitiativeFormImageFile(file);
        setInitiativeFormImagePreview(URL.createObjectURL(file));
      } else {
        setAspectImageFile(file);
        setAspectImagePreview(URL.createObjectURL(file));
      }
    }
  };

  const handleAddAchievement = () => {
    if (!newAchievement.trim() || !data) return;
    const currentAchievements = data.achievements || [];
    setData({
      ...data,
      achievements: [...currentAchievements, newAchievement.trim()]
    });
    setNewAchievement('');
  };

  const confirmRemoveAchievement = (index: number) => {
    setAchievementToDelete(index);
  };

  const handleRemoveAchievement = () => {
    if (achievementToDelete === null || !data || !data.achievements) return;
    const updated = [...data.achievements];
    updated.splice(achievementToDelete, 1);
    setData({ ...data, achievements: updated });
    setAchievementToDelete(null);
  };

  // Initiatives Handlers
  const openInitiativeModal = (index: number | null = null) => {
    if (index !== null && data?.initiatives) {
      setEditingInitiativeIndex(index);
      setInitiativeForm(data.initiatives[index]);
      setInitiativeFormImagePreview(data.initiatives[index].imageUrl || null);
    } else {
      setEditingInitiativeIndex(null);
      setInitiativeForm({ title: '', description: '', imageUrl: '' });
      setInitiativeFormImagePreview(null);
    }
    setInitiativeFormImageFile(null);
    setIsInitiativeModalOpen(true);
  };

  const handleSaveInitiative = async () => {
    if (!data || !initiativeForm.title) return;
    const initiatives = [...(data.initiatives || [])];
    const updatedInitiative = { ...initiativeForm };
    
    // Store the file temporarily if present, we handle the actual upload in final Save
    // For local UI consistency, we just update the data object
    if (initiativeImageFile) {
       // We'll upload this one immediately to get a URL for the local list
       // or we could mark it as "to be uploaded". To keep it simple, we upload now.
       setMessage({ type: 'success', target: 'initiative-modal', text: 'جاري رفع الصورة...' });
       const uploaded = await uploadImage(initiativeImageFile, `settings-simple/init_${Date.now()}`);
       if (uploaded) {
         updatedInitiative.imageUrl = uploaded;
       } else {
         setMessage({ type: 'error', target: 'initiative-modal', text: 'فشل في رفع الصورة.' });
         return;
       }
    }

    if (editingInitiativeIndex !== null) {
      initiatives[editingInitiativeIndex] = updatedInitiative;
    } else {
      initiatives.push(updatedInitiative);
    }

    setData({ ...data, initiatives });
    setIsInitiativeModalOpen(false);
  };

  const handleRemoveInitiative = (index: number) => {
    if (!data?.initiatives) return;
    const updated = [...data.initiatives];
    updated.splice(index, 1);
    setData({ ...data, initiatives: updated });
  };

  const generateChangesReport = () => {
    const report: string[] = [];
    if (!data || !initialData) return report;

    if (logoFile) report.push('تحديث شعار المجموعة');
    if (faviconFile) report.push('تحديث أيقونة المتصفح');
    if (data.title !== initialData.title) report.push(`تغيير اسم المجموعة إلى: ${data.title}`);
    if (data.aboutText !== initialData.aboutText) report.push('تعديل نص "من نحن"');
    
    if (aspectImageFile) report.push('تحديث الصورة في قسم "جانب من أعمالنا"');
    if (data.currentAspect?.title !== initialData.currentAspect?.title) report.push('تعديل العنوان الجانبي');
    if (data.currentAspect?.subTitle !== initialData.currentAspect?.subTitle) report.push('تعديل الوصف الجانبي');

    if (data.membersCount !== initialData.membersCount) report.push(`تعديل عدد الأعضاء (${initialData.membersCount} ← ${data.membersCount})`);
    if (data.projectsCount !== initialData.projectsCount) report.push(`تعديل عدد المشاريع المنجزة (${initialData.projectsCount} ← ${data.projectsCount})`);
    if (data.activeProjectsCount !== initialData.activeProjectsCount) report.push(`تعديل عدد المشاريع النشطة (${initialData.activeProjectsCount} ← ${data.activeProjectsCount})`);

    if (JSON.stringify(data.achievements) !== JSON.stringify(initialData.achievements)) {
      const added = data.achievements?.filter(a => !initialData.achievements?.includes(a)).length || 0;
      const removed = initialData.achievements?.filter(a => !data.achievements?.includes(a)).length || 0;
      if (added > 0) report.push(`إضافة ${added} إنجازات جديدة`);
      if (removed > 0) report.push(`حذف ${removed} إنجازات`);
    }

    if (JSON.stringify(data.initiatives) !== JSON.stringify(initialData.initiatives)) {
      report.push('تعديل في قائمة المبادرات');
    }

    if (JSON.stringify(data.contact) !== JSON.stringify(initialData.contact)) {
      report.push('تحديث بيانات التواصل');
    }

    return report;
  };

  const handleOpenSaveSummary = () => {
    const report = generateChangesReport();
    setChangesReport(report);
    setIsSaveSummaryOpen(true);
  };

  const handleFinalSave = async () => {
    if (!data) return;
    setIsSaveSummaryOpen(false);
    setSaving(true);
    setMessage(null);

    try {
      let logoUrl = data.logoUrl;
      let faviconUrl = data.faviconUrl;
      let aspectImageUrl = data.currentAspect?.imageUrl;

      if (logoFile) {
        const uploadedLogo = await uploadImage(logoFile, `settings-simple/logo_${Date.now()}`);
        if (uploadedLogo) logoUrl = uploadedLogo;
      }

      if (faviconFile) {
        const uploadedFavicon = await uploadImage(faviconFile, `settings-simple/favicon_${Date.now()}`);
        if (uploadedFavicon) faviconUrl = uploadedFavicon;
      }

      if (aspectImageFile) {
        const uploadedAspect = await uploadImage(aspectImageFile, `settings-simple/aspect_${Date.now()}`);
        if (uploadedAspect) aspectImageUrl = uploadedAspect;
      }

      const updatedData = {
        ...data,
        logoUrl,
        faviconUrl,
        currentAspect: data.currentAspect ? {
          ...data.currentAspect,
          imageUrl: aspectImageUrl || ''
        } : undefined
      };

      await updatePublicLandingData(updatedData);

      setData(updatedData);
      setInitialData(updatedData);
      setLogoFile(null);
      setFaviconFile(null);
      setAspectImageFile(null);
      setMessage({ type: 'success', target: 'global', text: 'تم حفظ جميع الإعدادات بنجاح!' });
    } catch (err) {
      console.error('Error saving settings:', err);
      setMessage({ type: 'error', target: 'global', text: 'حدث خطأ أثناء حفظ التغييرات.' });
    } finally {
      setSaving(false);
    }
  };

  const renderAlert = (target: MessageTarget) => {
    if (!message || message.target !== target) return null;
    return (
      <div className={`mb-4 p-3 rounded-lg flex items-center gap-3 animate-in slide-in-from-top duration-300 ${
        message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
      }`}>
        <span className="material-symbols-outlined text-sm">
          {message.type === 'success' ? 'check_circle' : 'error'}
        </span>
        <p className="font-medium text-[11px]">{message.text}</p>
      </div>
    );
  };

  if (loading || !user || !admin) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#d4af37] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <>
      <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a331a] flex items-center justify-between px-8 shrink-0">
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <span className="hover:text-[#0b3d0b] dark:hover:text-[#d4af37] transition-colors cursor-pointer">الرئيسية</span>
          <span className="material-symbols-outlined text-xs">chevron_left</span>
          <span className="font-medium text-slate-900 dark:text-slate-100">الإعدادات العامة</span>
        </div>
        <div className="flex items-center gap-4">
          {hasChanges && (
            <button
              onClick={handleOpenSaveSummary}
              disabled={saving}
              className="px-4 py-2 bg-[#0b3d0b] text-white rounded-lg text-sm font-bold hover:bg-[#155e15] disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm animate-in fade-in zoom-in duration-300"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <span className="material-symbols-outlined text-[20px]">save</span>
              )}
              حفظ التغييرات
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-5xl mx-auto space-y-8 pb-12">
          {renderAlert('global')}

          {/* Visual Identity Section */}
          <div className="bg-white dark:bg-[#1a331a] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 dark:border-slate-800 p-6 bg-slate-50/50 dark:bg-slate-900/20">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-[#0b3d0b] dark:text-[#d4af37]">settings_suggest</span>
                الهوية البصرية والعامة
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Logo Upload */}
                <div className="flex flex-col items-center gap-4 p-6 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/30 dark:bg-slate-900/10">
                  {renderAlert('logo')}
                  <div className="w-32 h-32 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden bg-white dark:bg-slate-900 relative group">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo Preview" className="w-full h-full object-contain p-2" />
                    ) : (
                      <span className="material-symbols-outlined text-4xl text-slate-300">add_photo_alternate</span>
                    )}
                    <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <span className="text-white text-xs font-bold">تغيير الشعار</span>
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'logo')} />
                    </label>
                  </div>
                  <div className="text-center">
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">الشعار الرسمي</h3>
                    <p className="text-[10px] text-slate-500 mt-1">يظهر في الهيدر والفوتر (PNG/SVG)</p>
                  </div>
                </div>

                {/* Favicon Upload */}
                <div className="flex flex-col items-center gap-4 p-6 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/30 dark:bg-slate-900/10">
                  {renderAlert('favicon')}
                  <div className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden bg-white dark:bg-slate-900 relative group">
                    {faviconPreview ? (
                      <img src={faviconPreview} alt="Favicon Preview" className="w-full h-full object-contain p-1" />
                    ) : (
                      <span className="material-symbols-outlined text-2xl text-slate-300">app_shortcut</span>
                    )}
                    <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <span className="text-white text-[10px] font-bold">تغيير</span>
                      <input type="file" className="hidden" accept="image/x-icon,image/png" onChange={(e) => handleFileChange(e, 'favicon')} />
                    </label>
                  </div>
                  <div className="text-center">
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">أيقونة المتصفح (Favicon)</h3>
                    <p className="text-[10px] text-slate-500 mt-1">تظهر في تبويب المتصفح (16x16 أو 32x32)</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">اسم المجموعة</label>
                  <input
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-[#0b3d0b]/20 focus:border-[#0b3d0b] outline-none transition-all dark:text-white"
                    type="text"
                    value={data?.title || ''}
                    onChange={(e) => setData(prev => prev ? { ...prev, title: e.target.value } : null)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">من نحن</label>
                  <textarea
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-[#0b3d0b]/20 focus:border-[#0b3d0b] outline-none transition-all dark:text-white leading-relaxed"
                    rows={4}
                    value={data?.aboutText || ''}
                    onChange={(e) => setData(prev => prev ? { ...prev, aboutText: e.target.value } : null)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Current Aspect Section */}
          <div className="bg-white dark:bg-[#1a331a] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 dark:border-slate-800 p-6 bg-slate-50/50 dark:bg-slate-900/20">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-[#0b3d0b] dark:text-[#d4af37]">aspect_ratio</span>
                جانب من أعمالنا (القسم الجانبي)
              </h2>
            </div>
            <div className="p-6">
              <div className="flex flex-col md:flex-row gap-8">
                <div className="flex flex-col items-center gap-4">
                  {renderAlert('aspect')}
                  <div className="w-40 h-56 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-900 relative group">
                    {aspectImagePreview ? (
                      <img src={aspectImagePreview} alt="Aspect Preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="material-symbols-outlined text-4xl text-slate-300">add_photo_alternate</span>
                    )}
                    <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <span className="text-white text-xs font-bold text-center px-4">اختر صورة عمودية (ماكس 2MB)</span>
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'aspect')} />
                    </label>
                  </div>
                  <p className="text-[10px] text-slate-500 text-center">يجب أن يكون الطول أكبر من العرض</p>
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">العنوان الجانبي</label>
                    <input
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-[#0b3d0b]/20 outline-none dark:text-white"
                      type="text"
                      placeholder="مثال: جانب من أنشطتنا الميدانية"
                      value={data?.currentAspect?.title || ''}
                      onChange={(e) => setData(prev => prev ? { ...prev, currentAspect: { ...(prev.currentAspect || { subTitle: '', imageUrl: '' }), title: e.target.value } } : null)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">الوصف الجانبي</label>
                    <input
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-[#0b3d0b]/20 outline-none dark:text-white"
                      type="text"
                      placeholder="مثال: التزام مستمر بخدمة المجتمع"
                      value={data?.currentAspect?.subTitle || ''}
                      onChange={(e) => setData(prev => prev ? { ...prev, currentAspect: { ...(prev.currentAspect || { title: '', imageUrl: '' }), subTitle: e.target.value } } : null)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Initiatives Section */}
          <div className="bg-white dark:bg-[#1a331a] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 dark:border-slate-800 p-6 bg-slate-50/50 dark:bg-slate-900/20 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-[#0b3d0b] dark:text-[#d4af37]">volunteer_activism</span>
                إدارة المبادرات
              </h2>
              <button
                onClick={() => openInitiativeModal()}
                className="text-xs font-medium bg-[#0b3d0b] text-white px-3 py-1.5 rounded hover:bg-[#155e15] transition-colors flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                إضافة مبادرة
              </button>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {data?.initiatives?.map((item, index) => (
                <div key={index} className="p-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-lg shrink-0 overflow-hidden border border-slate-200 dark:border-slate-700">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="material-symbols-outlined text-slate-400">image</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-900 dark:text-white text-base mb-1">{item.title}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1">{item.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => openInitiativeModal(index)}
                      className="p-2 text-slate-400 hover:text-[#0b3d0b] dark:hover:text-[#d4af37] transition-colors"
                    >
                      <span className="material-symbols-outlined">edit</span>
                    </button>
                    <button 
                      onClick={() => handleRemoveInitiative(index)}
                      className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                    >
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats Section */}
          <div className="bg-white dark:bg-[#1a331a] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 dark:border-slate-800 p-6 bg-slate-50/50 dark:bg-slate-900/20">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-[#0b3d0b] dark:text-[#d4af37]">bar_chart</span>
                الإحصائيات العامة
              </h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">عدد الأعضاء</label>
                <div className="relative">
                  <input
                    className="w-full pl-4 pr-10 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-[#0b3d0b]/20 focus:border-[#0b3d0b] outline-none transition-all dark:text-white font-bold"
                    type="number"
                    value={data?.membersCount || 0}
                    onChange={(e) => setData(prev => prev ? { ...prev, membersCount: parseInt(e.target.value) || 0 } : null)}
                  />
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">group</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">المشاريع المنجزة</label>
                <div className="relative">
                  <input
                    className="w-full pl-4 pr-10 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-[#0b3d0b]/20 focus:border-[#0b3d0b] outline-none transition-all dark:text-white font-bold"
                    type="number"
                    value={data?.projectsCount || 0}
                    onChange={(e) => setData(prev => prev ? { ...prev, projectsCount: parseInt(e.target.value) || 0 } : null)}
                  />
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">task_alt</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">المشاريع النشطة</label>
                <div className="relative">
                  <input
                    className="w-full pl-4 pr-10 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-[#0b3d0b]/20 focus:border-[#0b3d0b] outline-none transition-all dark:text-white font-bold"
                    type="number"
                    value={data?.activeProjectsCount || 0}
                    onChange={(e) => setData(prev => prev ? { ...prev, activeProjectsCount: parseInt(e.target.value) || 0 } : null)}
                  />
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">pending_actions</span>
                </div>
              </div>
            </div>
          </div>

          {/* Achievements Section */}
          <div className="bg-white dark:bg-[#1a331a] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 dark:border-slate-800 p-6 bg-slate-50/50 dark:bg-slate-900/20">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-[#0b3d0b] dark:text-[#d4af37]">emoji_events</span>
                قائمة الإنجازات
              </h2>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex gap-2">
                <input
                  className="flex-1 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-[#0b3d0b]/20 focus:border-[#0b3d0b] outline-none transition-all dark:text-white"
                  placeholder="أضف إنجازاً جديداً..."
                  value={newAchievement}
                  onChange={(e) => setNewAchievement(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddAchievement()}
                />
                <button
                  onClick={handleAddAchievement}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-medium"
                >
                  إضافة
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data?.achievements?.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/30 group">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-yellow-500 text-[20px]">star</span>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{item}</span>
                    </div>
                    <button 
                      onClick={() => confirmRemoveAchievement(index)}
                      className="text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Contact Information Section */}
          <div className="bg-white dark:bg-[#1a331a] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 dark:border-slate-800 p-6 bg-slate-50/50 dark:bg-slate-900/20">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-[#0b3d0b] dark:text-[#d4af37]">contact_phone</span>
                بيانات التواصل
              </h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">رقم الواتساب</label>
                <input
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-[#0b3d0b]/20 focus:border-[#0b3d0b] outline-none transition-all dark:text-white"
                  dir="ltr"
                  type="text"
                  placeholder="+222 36..."
                  value={data?.contact?.whatsapp || ''}
                  onChange={(e) => setData(prev => prev ? { ...prev, contact: { ...prev.contact, whatsapp: e.target.value } } : null)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">رقم الهاتف</label>
                <input
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-[#0b3d0b]/20 focus:border-[#0b3d0b] outline-none transition-all dark:text-white"
                  dir="ltr"
                  type="text"
                  placeholder="+222 22..."
                  value={data?.contact?.phone || ''}
                  onChange={(e) => setData(prev => prev ? { ...prev, contact: { ...prev.contact, phone: e.target.value } } : null)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">البريد الإلكتروني</label>
                <input
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-[#0b3d0b]/20 focus:border-[#0b3d0b] outline-none transition-all dark:text-white"
                  dir="ltr"
                  type="email"
                  placeholder="info@..."
                  value={data?.contact?.email || ''}
                  onChange={(e) => setData(prev => prev ? { ...prev, contact: { ...prev.contact, email: e.target.value } } : null)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">العنوان</label>
                <input
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-[#0b3d0b]/20 focus:border-[#0b3d0b] outline-none transition-all dark:text-white"
                  type="text"
                  placeholder="مدينة الغدية..."
                  value={data?.contact?.address || ''}
                  onChange={(e) => setData(prev => prev ? { ...prev, contact: { ...prev.contact, address: e.target.value } } : null)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Initiative Modal */}
      {isInitiativeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-[#1a331a] w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in duration-300">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20">
              <h3 className="font-black text-xl">
                {editingInitiativeIndex !== null ? 'تعديل مبادرة' : 'إضافة مبادرة جديدة'}
              </h3>
              <button onClick={() => setIsInitiativeModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 space-y-6">
              {renderAlert('initiative-modal')}
              <div className="flex flex-col items-center gap-4">
                <div className="w-32 h-32 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-900 relative group">
                  {initiativeImagePreview ? (
                    <img src={initiativeImagePreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <span className="material-symbols-outlined text-4xl text-slate-300">add_photo_alternate</span>
                  )}
                  <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <span className="text-white text-xs font-bold text-center px-2">اختر صورة مربعة (ماكس 2MB)</span>
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'initiative')} />
                  </label>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">عنوان المبادرة</label>
                  <input
                    className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-[#0b3d0b]/20 outline-none dark:text-white"
                    type="text"
                    value={initiativeForm.title}
                    onChange={(e) => setInitiativeForm({ ...initiativeForm, title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">وصف قصير</label>
                  <textarea
                    className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-[#0b3d0b]/20 outline-none dark:text-white"
                    rows={3}
                    value={initiativeForm.description}
                    onChange={(e) => setInitiativeForm({ ...initiativeForm, description: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800 flex gap-3">
              <button
                onClick={handleSaveInitiative}
                disabled={!initiativeForm.title}
                className="flex-1 h-11 bg-[#0b3d0b] text-white rounded-lg font-bold hover:bg-[#155e15] disabled:opacity-50 transition-all"
              >
                {editingInitiativeIndex !== null ? 'تحديث' : 'إضافة'}
              </button>
              <button
                onClick={() => setIsInitiativeModalOpen(false)}
                className="px-6 h-11 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold hover:bg-slate-50 transition-all"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Achievement Confirmation */}
      {achievementToDelete !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1a331a] w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 text-center animate-in zoom-in duration-200">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-3xl">delete_forever</span>
            </div>
            <h3 className="text-xl font-black mb-2">تأكيد الحذف</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6">هل أنت متأكد من رغبتك في حذف هذا الإنجاز؟ لا يمكن التراجع عن هذا الإجراء.</p>
            <div className="flex gap-3">
              <button
                onClick={handleRemoveAchievement}
                className="flex-1 h-11 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-all"
              >
                نعم، احذف
              </button>
              <button
                onClick={() => setAchievementToDelete(null)}
                className="flex-1 h-11 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg font-bold hover:bg-slate-200 transition-all"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Changes Summary Modal */}
      {isSaveSummaryOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1a331a] w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
              <h3 className="font-black text-xl flex items-center gap-2">
                <span className="material-symbols-outlined text-[#0b3d0b] dark:text-[#d4af37]">assignment_turned_in</span>
                تقرير التغييرات الجديدة
              </h3>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">أنت على وشك حفظ التغييرات التالية على الموقع:</p>
              <ul className="space-y-3 max-h-64 overflow-y-auto mb-6 pr-2">
                {changesReport.map((change, idx) => (
                  <li key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-[#0b3d0b]/5 border border-[#0b3d0b]/10">
                    <span className="material-symbols-outlined text-[#0b3d0b] text-[18px] mt-0.5">check_circle</span>
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{change}</span>
                  </li>
                ))}
              </ul>
              <div className="flex gap-3">
                <button
                  onClick={handleFinalSave}
                  className="flex-1 h-12 bg-[#0b3d0b] text-white rounded-lg font-bold hover:bg-[#155e15] shadow-lg shadow-[#0b3d0b]/20 transition-all"
                >
                  تأكيد وحفظ الكل
                </button>
                <button
                  onClick={() => setIsSaveSummaryOpen(false)}
                  className="px-8 h-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold hover:bg-slate-50 transition-all"
                >
                  رجوع
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
