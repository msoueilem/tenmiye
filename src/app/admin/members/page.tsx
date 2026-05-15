'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { UserMember } from '@/types/users';
import { getAllUsers, updateUser, deleteUser, addUser } from '@/features/users/api.client';
import { uploadImage } from '@/features/uploads/api.client';
import { useDashboard } from '@/context/DashboardContext';

export default function MembersPage() {
  const { admin } = useDashboard();
  const [users, setUsers] = useState<UserMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Modals State
  const [userToDelete, setUserToDelete] = useState<UserMember | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewingUser, setViewingUser] = useState<UserMember | null>(null);
  const [editingUser, setEditingUser] = useState<UserMember | null>(null);
  const [statusToToggle, setStatusToToggle] = useState<{ user: UserMember, newStatus: UserMember['status'] } | null>(null);
  
  const [isSaving, setIsSaving] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Form States
  const defaultUserForm: Omit<UserMember, 'id' | 'createdAt'> = {
    name: '',
    phoneNumber: '',
    status: 'active',
    notes: '',
    contribution: 0,
    totalContribution: 0,
    totalDonation: 0,
    monthsCovered: 0,
    photoUrl: '',
    dateOfBirth: '',
    occupation: '',
    location: ''
  };

  const [addForm, setAddModalForm] = useState(defaultUserForm);
  const [editForm, setEditModalForm] = useState<Partial<UserMember>>({});
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    const data = await getAllUsers();
    setUsers(data);
    setLoading(false);
  }

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = (u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             u.phoneNumber.includes(searchTerm));
      const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [users, searchTerm, statusFilter]);

  const handlePhotoUpload = async (file: File): Promise<string | null> => {
    if (file.size > 2 * 1024 * 1024) {
      setUploadError('حجم الصورة كبير جداً (الأقصى 2 ميجا)');
      return null;
    }
    const url = await uploadImage(file, `members-simple/${Date.now()}_${file.name}`);
    return url;
  };

  const handleAddUser = async () => {
    if (!addForm.name || !addForm.phoneNumber) return;
    setIsSaving(true);
    const newUserId = await addUser(addForm);
    if (newUserId) {
      setIsAddModalOpen(false);
      setAddModalForm(defaultUserForm);
      setPhotoPreview(null);
      fetchUsers();
    }
    setIsSaving(false);
  };

  const handleEditUser = async () => {
    if (!editingUser || !editForm.name || !editForm.phoneNumber) return;
    setIsSaving(true);
    try {
      await updateUser(editingUser.id, editForm);
      setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...editForm } as UserMember : u));
      setEditingUser(null);
      setPhotoPreview(null);
    } catch (err) {
      console.error('Error updating user:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmToggleStatus = async () => {
    if (!statusToToggle) return;
    setIsSaving(true);
    try {
      await updateUser(statusToToggle.user.id, { status: statusToToggle.newStatus });
      setUsers(prev => prev.map(u => u.id === statusToToggle.user.id ? { ...u, status: statusToToggle.newStatus } : u));
      setStatusToToggle(null);
    } catch (err) {
      console.error('Error toggling status:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!userToDelete) return;
    setIsSaving(true);
    try {
      await deleteUser(userToDelete.id);
      setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
      setUserToDelete(null);
    } catch (err) {
      console.error('Error deleting user:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const openEditModal = (user: UserMember) => {
    setEditingUser(user);
    setEditModalForm({ ...user });
    setPhotoPreview(user.photoUrl || null);
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setUploadError(null);
      const url = await handlePhotoUpload(file);
      if (url) {
        setPhotoPreview(url);
        if (isEdit) {
          setEditModalForm(prev => ({ ...prev, photoUrl: url }));
        } else {
          setAddModalForm(prev => ({ ...prev, photoUrl: url }));
        }
      }
    }
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
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div className="flex flex-col gap-1">
          <h2 className="text-slate-900 dark:text-white text-3xl font-bold tracking-tight">إدارة الأعضاء</h2>
          <p className="text-slate-500 dark:text-slate-400 text-base">عرض وإدارة قائمة الأعضاء المسجلين في النظام</p>
        </div>
        <button
          onClick={() => {
            setAddModalForm(defaultUserForm);
            setPhotoPreview(null);
            setIsAddModalOpen(true);
          }}
          className="flex items-center gap-2 bg-[#0df20d] hover:bg-[#0be00b] text-slate-900 font-bold py-2.5 px-5 rounded-lg shadow-sm transition-all active:scale-95"
        >
          <span className="material-symbols-outlined">add</span>
          <span>إضافة عضو جديد</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="bg-white dark:bg-[#1a331a] rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
              <span className="material-symbols-outlined">search</span>
            </div>
            <input
              className="block w-full rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0df20d]/20 outline-none pr-10 py-2.5 text-sm"
              placeholder="بحث بالاسم أو رقم الهاتف..."
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <select
              className="rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-[#0df20d]/20 outline-none py-2.5 pl-8 pr-4 text-sm min-w-[140px]"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">جميع الحالات</option>
              <option value="active">نشط</option>
              <option value="pending">معلق</option>
              <option value="blocked">محظور</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white dark:bg-[#1a331a] rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100">الاسم</th>
                <th className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100">رقم الهاتف</th>
                <th className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100">الحالة</th>
                <th className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {u.photoUrl ? (
                        <img src={u.photoUrl} alt={u.name} className="w-9 h-9 rounded-full object-cover border border-[#0df20d]/20" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-[#0df20d]/10 text-[#0df20d] flex items-center justify-center text-sm font-bold">
                          {u.name?.charAt(0) || 'U'}
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">{u.name}</div>
                        <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                          تاريخ التسجيل: {u.createdAt?.toDate ? u.createdAt.toDate().toLocaleDateString('ar-MR') : 'جديد'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium" dir="ltr">{u.phoneNumber}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                      u.status === 'active' 
                        ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' 
                        : u.status === 'blocked'
                        ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
                        : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        u.status === 'active' ? 'bg-green-600 dark:bg-green-400' :
                        u.status === 'blocked' ? 'bg-red-600 dark:bg-red-400' :
                        'bg-amber-600 dark:bg-amber-400'
                      }`}></span>
                      {u.status === 'active' ? 'نشط' : u.status === 'blocked' ? 'محظور' : 'معلق'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setViewingUser(u)}
                        className="p-2 text-slate-400 hover:text-[#0df20d] hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-all"
                        title="عرض"
                      >
                        <span className="material-symbols-outlined text-[20px]">visibility</span>
                      </button>
                      <button
                        onClick={() => openEditModal(u)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                        title="تعديل"
                      >
                        <span className="material-symbols-outlined text-[20px]">edit</span>
                      </button>
                      
                      {u.status === 'active' ? (
                        <button
                          onClick={() => setStatusToToggle({ user: u, newStatus: 'blocked' })}
                          className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-all"
                          title="تعطيل"
                        >
                          <span className="material-symbols-outlined text-[20px]">block</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => setStatusToToggle({ user: u, newStatus: 'active' })}
                          className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-all"
                          title="تنشيط"
                        >
                          <span className="material-symbols-outlined text-[20px]">check_circle</span>
                        </button>
                      )}

                      <button
                        onClick={() => setUserToDelete(u)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                        title="حذف"
                      >
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* View User Modal */}
      {viewingUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1a331a] w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20">
              <h3 className="font-black text-xl">تفاصيل العضو</h3>
              <button onClick={() => setViewingUser(null)} className="text-slate-400 hover:text-slate-600"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-8 mb-8">
                <div className="w-32 h-32 rounded-2xl bg-[#0df20d]/10 text-[#0df20d] flex items-center justify-center text-5xl font-black shrink-0 overflow-hidden border-2 border-[#0df20d]/20">
                  {viewingUser.photoUrl ? (
                    <img src={viewingUser.photoUrl} alt={viewingUser.name} className="w-full h-full object-cover" />
                  ) : viewingUser.name?.charAt(0)}
                </div>
                <div className="flex-1 text-center md:text-right">
                  <h4 className="text-3xl font-black mb-1">{viewingUser.name}</h4>
                  <p className="text-slate-500 text-lg mb-4" dir="ltr">{viewingUser.phoneNumber}</p>
                  <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      viewingUser.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                    }`}>
                      {viewingUser.status === 'active' ? 'نشط' : 'غير نشط'}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-xs font-bold">
                      {viewingUser.occupation || 'غير محدد'}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-xs font-bold">
                      {viewingUser.location || 'الموقع غير محدد'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="space-y-4">
                  <h5 className="font-bold border-b pb-2 text-[#0df20d]">البيانات المالية</h5>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
                      <p className="text-slate-500 text-[10px] mb-1">المساهمة الشهرية</p>
                      <p className="font-bold text-lg text-emerald-600">{viewingUser.contribution?.toLocaleString() || 0} أوقية</p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
                      <p className="text-slate-500 text-[10px] mb-1">الشهور المغطاة</p>
                      <p className="font-bold text-lg">{viewingUser.monthsCovered || 0}</p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
                      <p className="text-slate-500 text-[10px] mb-1">إجمالي المساهمات</p>
                      <p className="font-bold text-lg">{viewingUser.totalContribution?.toLocaleString() || 0}</p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
                      <p className="text-slate-500 text-[10px] mb-1">إجمالي التبرعات</p>
                      <p className="font-bold text-lg text-blue-600">{viewingUser.totalDonation?.toLocaleString() || 0}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h5 className="font-bold border-b pb-2 text-[#0df20d]">معلومات الملف الشخصي</h5>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm p-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                      <span className="text-slate-500">تاريخ الميلاد</span>
                      <span className="font-medium">{viewingUser.dateOfBirth || 'غير مسجل'}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm p-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                      <span className="text-slate-500">المهنة</span>
                      <span className="font-medium">{viewingUser.occupation || 'غير مسجل'}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm p-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                      <span className="text-slate-500">الموقع</span>
                      <span className="font-medium">{viewingUser.location || 'غير مسجل'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {viewingUser.notes && (
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                  <p className="text-slate-500 text-[11px] mb-2 font-bold uppercase tracking-wider">ملاحظات إدارية</p>
                  <p className="text-sm leading-relaxed whitespace-pre-line">{viewingUser.notes}</p>
                </div>
              )}
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800 flex gap-3">
              <button onClick={() => { setViewingUser(null); openEditModal(viewingUser); }} className="flex-1 h-11 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20">
                <span className="material-symbols-outlined text-[20px]">edit</span> تعديل البيانات
              </button>
              <button onClick={() => setViewingUser(null)} className="px-8 h-11 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold hover:bg-slate-50 transition-all">إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit/Add User Modal */}
      {(editingUser || isAddModalOpen) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1a331a] w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 flex justify-between items-center">
              <h3 className="font-black text-xl">{editingUser ? 'تعديل بيانات العضو' : 'إضافة عضو جديد'}</h3>
              <button onClick={() => { setEditingUser(null); setIsAddModalOpen(false); }} className="text-slate-400 hover:text-slate-600"><span className="material-symbols-outlined">close</span></button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[75vh]">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Left Column: Photo & Basic */}
                <div className="md:col-span-1 space-y-6">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-32 h-32 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-900 relative group">
                      {photoPreview ? (
                        <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <span className="material-symbols-outlined text-4xl text-slate-300">add_a_photo</span>
                      )}
                      <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        <span className="text-white text-[10px] font-bold">تغيير الصورة</span>
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => onFileChange(e, !!editingUser)} />
                      </label>
                    </div>
                    {uploadError && <p className="text-[10px] text-red-500 font-bold">{uploadError}</p>}
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">الاسم بالكامل</label>
                      <input
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-[#0df20d]/20 outline-none text-sm"
                        type="text"
                        value={editingUser ? editForm.name : addForm.name}
                        onChange={(e) => editingUser ? setEditModalForm({ ...editForm, name: e.target.value }) : setAddModalForm({ ...addForm, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">رقم الهاتف</label>
                      <input
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-[#0df20d]/20 outline-none text-sm"
                        dir="ltr"
                        type="text"
                        value={editingUser ? editForm.phoneNumber : addForm.phoneNumber}
                        onChange={(e) => editingUser ? setEditModalForm({ ...editForm, phoneNumber: e.target.value }) : setAddModalForm({ ...addForm, phoneNumber: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column: Financials & Others */}
                <div className="md:col-span-2 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">المساهمة الشهرية</label>
                      <input
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-[#0df20d]/20 outline-none text-sm"
                        type="number"
                        value={editingUser ? editForm.contribution : addForm.contribution}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          editingUser ? setEditModalForm({ ...editForm, contribution: val }) : setAddModalForm({ ...addForm, contribution: val });
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">الشهور المغطاة</label>
                      <input
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-[#0df20d]/20 outline-none text-sm"
                        type="number"
                        value={editingUser ? editForm.monthsCovered : addForm.monthsCovered}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          editingUser ? setEditModalForm({ ...editForm, monthsCovered: val }) : setAddModalForm({ ...addForm, monthsCovered: val });
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">إجمالي المساهمات</label>
                      <input
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-[#0df20d]/20 outline-none text-sm"
                        type="number"
                        value={editingUser ? editForm.totalContribution : addForm.totalContribution}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          editingUser ? setEditModalForm({ ...editForm, totalContribution: val }) : setAddModalForm({ ...addForm, totalContribution: val });
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">إجمالي التبرعات</label>
                      <input
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-[#0df20d]/20 outline-none text-sm"
                        type="number"
                        value={editingUser ? editForm.totalDonation : addForm.totalDonation}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          editingUser ? setEditModalForm({ ...editForm, totalDonation: val }) : setAddModalForm({ ...addForm, totalDonation: val });
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">تاريخ الميلاد</label>
                      <input
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-[#0df20d]/20 outline-none text-sm"
                        type="date"
                        value={editingUser ? editForm.dateOfBirth : addForm.dateOfBirth}
                        onChange={(e) => editingUser ? setEditModalForm({ ...editForm, dateOfBirth: e.target.value }) : setAddModalForm({ ...addForm, dateOfBirth: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">المهنة</label>
                      <input
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-[#0df20d]/20 outline-none text-sm"
                        type="text"
                        value={editingUser ? editForm.occupation : addForm.occupation}
                        onChange={(e) => editingUser ? setEditModalForm({ ...editForm, occupation: e.target.value }) : setAddModalForm({ ...addForm, occupation: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">الموقع / العنوان</label>
                    <input
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-[#0df20d]/20 outline-none text-sm"
                      type="text"
                      value={editingUser ? editForm.location : addForm.location}
                      onChange={(e) => editingUser ? setEditModalForm({ ...editForm, location: e.target.value }) : setAddModalForm({ ...addForm, location: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">ملاحظات</label>
                    <textarea
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-[#0df20d]/20 outline-none text-sm"
                      rows={2}
                      value={editingUser ? editForm.notes : addForm.notes}
                      onChange={(e) => editingUser ? setEditModalForm({ ...editForm, notes: e.target.value }) : setAddModalForm({ ...addForm, notes: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800 flex gap-3">
              <button
                onClick={editingUser ? handleEditUser : handleAddUser}
                disabled={isSaving || (editingUser ? (!editForm.name || !editForm.phoneNumber) : (!addForm.name || !addForm.phoneNumber))}
                className={`flex-1 h-11 text-white rounded-lg font-bold disabled:opacity-50 transition-all ${editingUser ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20' : 'bg-[#0df20d] text-slate-900 hover:bg-[#0be00b] shadow-[#0df20d]/20 shadow-lg'}`}
              >
                {isSaving ? 'جاري الحفظ...' : editingUser ? 'حفظ التغييرات' : 'إضافة العضو'}
              </button>
              <button
                onClick={() => { setEditingUser(null); setIsAddModalOpen(false); }}
                className="px-8 h-11 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold hover:bg-slate-50 transition-all"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Status Confirmation Modal */}
      {statusToToggle && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1a331a] w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 text-center animate-in zoom-in duration-200">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
              statusToToggle.newStatus === 'active' ? 'bg-green-100 text-green-600 dark:bg-green-900/20' : 'bg-orange-100 text-orange-600 dark:bg-orange-900/20'
            }`}>
              <span className="material-symbols-outlined text-3xl">
                {statusToToggle.newStatus === 'active' ? 'check_circle' : 'block'}
              </span>
            </div>
            <h3 className="text-xl font-black mb-2">تغيير حالة العضو</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">
              هل أنت متأكد من رغبتك في {statusToToggle.newStatus === 'active' ? 'تنشيط' : 'تعطيل'} العضو <span className="font-bold text-slate-700 dark:text-slate-200">{statusToToggle.user.name}</span>؟
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleConfirmToggleStatus}
                disabled={isSaving}
                className={`flex-1 h-11 rounded-lg font-bold transition-all ${
                  statusToToggle.newStatus === 'active' ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-orange-600 text-white hover:bg-orange-700'
                }`}
              >
                {isSaving ? 'جاري التنفيذ...' : 'نعم، قم بذلك'}
              </button>
              <button
                onClick={() => setStatusToToggle(null)}
                className="flex-1 h-11 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg font-bold hover:bg-slate-200 transition-all"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1a331a] w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 text-center animate-in zoom-in duration-200">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-3xl">delete_forever</span>
            </div>
            <h3 className="text-xl font-black mb-2 text-slate-900 dark:text-white">حذف العضو</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">
              هل أنت متأكد من رغبتك في حذف العضو <span className="font-bold text-slate-700 dark:text-slate-200">{userToDelete.name}</span> نهائياً؟
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={isSaving}
                className="flex-1 h-11 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 disabled:opacity-50 transition-all"
              >
                {isSaving ? 'جاري الحذف...' : 'نعم، احذف'}
              </button>
              <button
                onClick={() => setUserToDelete(null)}
                className="flex-1 h-11 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg font-bold hover:bg-slate-200 transition-all"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
