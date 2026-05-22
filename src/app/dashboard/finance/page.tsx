'use client';

import { useEffect, useState } from 'react';
import { useMemberAuth } from '@/context/MemberAuthContext';
import type { Transaction, PaymentChannel, FinanceSummary, CreateTransactionDto, CreatePaymentChannelDto } from '@/types/finance';
import {
  getTransactions,
  getPaymentChannels,
  getFinanceSummary,
  createTransaction,
  createPaymentChannel,
  updatePaymentChannel,
} from '@/features/finance/api.client';

type Tab = 'summary' | 'add' | 'history' | 'channels';

const INPUT = 'w-full rounded-lg border border-white/10 bg-[#071a07] px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#0df20d]/30';

const emptyChannelForm = (): CreatePaymentChannelDto => ({
  name: '',
  type: 'mobile',
  walletNumber: '',
  walletOwner: '',
  isActive: true,
});

export default function MemberFinancePage() {
  const { user } = useMemberAuth();
  const canManage = user?.permissions.includes('MANAGE_FINANCE') ?? false;

  const [tab, setTab] = useState<Tab>('summary');
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [channels, setChannels] = useState<PaymentChannel[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Transaction form
  const [txForm, setTxForm] = useState<CreateTransactionDto>({
    type: 'contribution',
    amount: 0,
    date: new Date().toISOString().slice(0, 10),
    paymentChannelId: '',
    description: '',
  });

  // Channel form
  const [channelForm, setChannelForm] = useState<CreatePaymentChannelDto>(emptyChannelForm());
  const [editingChannel, setEditingChannel] = useState<PaymentChannel | null>(null);
  const [showChannelForm, setShowChannelForm] = useState(false);
  const [channelSaving, setChannelSaving] = useState(false);
  const [channelError, setChannelError] = useState('');

  useEffect(() => {
    const fetches: Promise<unknown>[] = [getFinanceSummary(), getTransactions()];
    if (canManage) fetches.push(getPaymentChannels());
    Promise.all(fetches)
      .then(([s, t, c]) => {
        setSummary(s as FinanceSummary);
        setTransactions(t as Transaction[]);
        if (c) setChannels(c as PaymentChannel[]);
      })
      .catch(() => setError('فشل تحميل البيانات المالية'))
      .finally(() => setPageLoading(false));
  }, [canManage]);

  const handleSubmitTx = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const created = await createTransaction(txForm);
      setTransactions((prev) => [created, ...prev]);
      setTxForm({ type: 'contribution', amount: 0, date: new Date().toISOString().slice(0, 10), paymentChannelId: '', description: '' });
      setSuccess('تم تسجيل المعاملة بنجاح');
      setTab('history');
    } catch {
      setError('فشل التسجيل');
    } finally {
      setSaving(false);
    }
  };

  const openNewChannel = () => {
    setEditingChannel(null);
    setChannelForm(emptyChannelForm());
    setChannelError('');
    setShowChannelForm(true);
  };

  const openEditChannel = (ch: PaymentChannel) => {
    setEditingChannel(ch);
    setChannelForm({ name: ch.name, type: ch.type, walletNumber: ch.walletNumber ?? '', walletOwner: ch.walletOwner ?? '', isActive: ch.isActive });
    setChannelError('');
    setShowChannelForm(true);
  };

  const handleSubmitChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    setChannelSaving(true);
    setChannelError('');
    try {
      if (editingChannel) {
        const updated = await updatePaymentChannel(editingChannel.id, channelForm);
        setChannels((prev) => prev.map((c) => c.id === editingChannel.id ? updated : c));
      } else {
        const created = await createPaymentChannel(channelForm);
        setChannels((prev) => [...prev, created]);
      }
      setShowChannelForm(false);
      setEditingChannel(null);
    } catch {
      setChannelError('فشل الحفظ');
    } finally {
      setChannelSaving(false);
    }
  };

  const tabs: { key: Tab; label: string; show: boolean }[] = [
    { key: 'summary', label: 'الملخص', show: true },
    { key: 'add', label: 'تسجيل معاملة', show: canManage },
    { key: 'history', label: 'السجل', show: true },
    { key: 'channels', label: 'قنوات الدفع', show: canManage },
  ];

  if (pageLoading) {
    return (
      <div className="max-w-lg space-y-4">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-white/10" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-lg bg-[#071a07]" />)}
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-lg bg-[#071a07]" />)}
        </div>
      </div>
    );
  }

  return (
    <>
      <div dir="rtl">
        <h1 className="mb-6 text-xl font-bold text-[#0df20d]">الشؤون المالية</h1>
        {error && <p className="mb-4 text-red-400">{error}</p>}
        {success && <p className="mb-4 text-green-400">{success}</p>}

        <div className="mb-6 flex gap-2 border-b border-white/10">
          {tabs.filter((t) => t.show).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`cursor-pointer px-4 py-2 text-sm transition-colors ${
                tab === t.key
                  ? 'border-b-2 border-[#0df20d] text-[#0df20d]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'summary' && summary && (
          <div className="max-w-lg space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg bg-[#071a07] p-4 text-center">
                <p className="mb-1 text-xs text-slate-400">المساهمات</p>
                <p className="text-lg font-bold text-green-400">{summary.totals.contribution} {summary.currency}</p>
              </div>
              <div className="rounded-lg bg-[#071a07] p-4 text-center">
                <p className="mb-1 text-xs text-slate-400">التبرعات</p>
                <p className="text-lg font-bold text-green-300">{summary.totals.donation} {summary.currency}</p>
              </div>
              <div className="rounded-lg bg-[#071a07] p-4 text-center">
                <p className="mb-1 text-xs text-slate-400">المصروفات</p>
                <p className="text-lg font-bold text-red-400">{summary.totals.expense} {summary.currency}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-[#071a07] p-4 text-center">
                <p className="mb-1 text-xs text-slate-400">إجمالي الدخل</p>
                <p className="text-lg font-bold text-green-400">{summary.income} {summary.currency}</p>
              </div>
              <div className="rounded-lg bg-[#071a07] p-4 text-center">
                <p className="mb-1 text-xs text-slate-400">الصافي</p>
                <p className={`text-lg font-bold ${summary.net >= 0 ? 'text-[#0df20d]' : 'text-red-400'}`}>
                  {summary.net} {summary.currency}
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-500">سنة {summary.year}{summary.month ? ` — شهر ${summary.month}` : ''}</p>
          </div>
        )}

        {tab === 'add' && canManage && (
          <form onSubmit={(e) => void handleSubmitTx(e)} className="flex max-w-md flex-col gap-4">
            <select className={INPUT} value={txForm.type}
              onChange={(e) => setTxForm((p) => ({ ...p, type: e.target.value as CreateTransactionDto['type'] }))}>
              <option value="contribution">مساهمة</option>
              <option value="donation">تبرع</option>
              <option value="expense">مصروف</option>
            </select>
            <input type="number" className={INPUT} placeholder="المبلغ" min={0}
              value={txForm.amount || ''}
              onChange={(e) => setTxForm((p) => ({ ...p, amount: parseFloat(e.target.value) || 0 }))}
              required />
            <input type="date" className={INPUT} value={txForm.date}
              onChange={(e) => setTxForm((p) => ({ ...p, date: e.target.value }))} required />
            {channels.filter((c) => c.isActive).length > 0 && (
              <select className={INPUT} value={txForm.paymentChannelId}
                onChange={(e) => setTxForm((p) => ({ ...p, paymentChannelId: e.target.value }))} required>
                <option value="">اختر قناة الدفع</option>
                {channels.filter((c) => c.isActive).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
            <textarea className={INPUT} placeholder="الوصف (اختياري)" value={txForm.description}
              onChange={(e) => setTxForm((p) => ({ ...p, description: e.target.value }))} rows={2} />
            <button type="submit" disabled={saving}
              className="cursor-pointer rounded-lg bg-[#0df20d] px-4 py-3 font-bold text-slate-900 hover:bg-[#0be00b] disabled:opacity-50">
              {saving ? 'جاري التسجيل...' : 'تسجيل'}
            </button>
          </form>
        )}

        {tab === 'history' && (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div key={tx.id} className="rounded-xl border border-white/10 bg-[#071a07] p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white">{tx.notes ?? tx.description ?? tx.type}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{tx.date?.slice(0, 10) ?? tx.createdAt?.slice(0, 10)}</p>
                  </div>
                  <div className="mr-4 text-right">
                    <p className={`text-sm font-semibold ${tx.type === 'expense' ? 'text-red-400' : 'text-[#0df20d]'}`}>
                      {tx.type === 'expense' ? '-' : '+'}{tx.amount} MRU
                    </p>
                    <p className={`text-xs ${tx.status === 'verified' ? 'text-green-400' : tx.status === 'rejected' ? 'text-red-400' : 'text-yellow-400'}`}>
                      {tx.status === 'verified' ? 'موثق' : tx.status === 'rejected' ? 'مرفوض' : 'معلق'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {transactions.length === 0 && (
              <p className="py-8 text-center text-slate-500">لا توجد معاملات</p>
            )}
          </div>
        )}

        {tab === 'channels' && canManage && (
          <div className="max-w-lg">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-slate-400">{channels.length} قناة</p>
              <button onClick={openNewChannel}
                className="cursor-pointer rounded-lg bg-[#0df20d] px-4 py-2 text-sm font-bold text-slate-900 hover:bg-[#0be00b]">
                + قناة جديدة
              </button>
            </div>
            <div className="space-y-3">
              {channels.map((ch) => (
                <div key={ch.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-[#071a07] p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-white">{ch.name}</p>
                      <span className={`text-xs ${ch.isActive ? 'text-green-400' : 'text-slate-500'}`}>
                        {ch.isActive ? '● نشط' : '○ معطّل'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{ch.type === 'mobile' ? 'محفظة إلكترونية' : 'نقدي'}</p>
                    {ch.walletNumber && <p className="text-xs text-slate-400" dir="ltr">{ch.walletNumber}</p>}
                  </div>
                  <button onClick={() => openEditChannel(ch)}
                    className="cursor-pointer rounded-lg bg-white/5 px-3 py-1.5 text-xs font-bold text-[#0df20d] hover:bg-white/10">
                    تعديل
                  </button>
                </div>
              ))}
              {channels.length === 0 && (
                <p className="py-8 text-center text-slate-500">لا توجد قنوات دفع</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Channel create/edit modal */}
      {showChannelForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setShowChannelForm(false); }}
        >
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0a1f0a] p-6 shadow-2xl" dir="rtl">
            <h2 className="mb-5 text-lg font-bold text-white">
              {editingChannel ? 'تعديل قناة الدفع' : 'قناة دفع جديدة'}
            </h2>
            <form onSubmit={(e) => void handleSubmitChannel(e)} className="flex flex-col gap-4">
              <input className={INPUT} placeholder="اسم القناة *" value={channelForm.name}
                onChange={(e) => setChannelForm((p) => ({ ...p, name: e.target.value }))} required />
              <select className={INPUT} value={channelForm.type}
                onChange={(e) => setChannelForm((p) => ({ ...p, type: e.target.value as 'mobile' | 'cash' }))}>
                <option value="mobile">محفظة إلكترونية</option>
                <option value="cash">نقدي</option>
              </select>
              {channelForm.type === 'mobile' && (
                <>
                  <input className={INPUT} placeholder="رقم المحفظة" dir="ltr" value={channelForm.walletNumber ?? ''}
                    onChange={(e) => setChannelForm((p) => ({ ...p, walletNumber: e.target.value }))} />
                  <input className={INPUT} placeholder="اسم صاحب المحفظة" value={channelForm.walletOwner ?? ''}
                    onChange={(e) => setChannelForm((p) => ({ ...p, walletOwner: e.target.value }))} />
                </>
              )}
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input type="checkbox" checked={channelForm.isActive ?? true}
                  onChange={(e) => setChannelForm((p) => ({ ...p, isActive: e.target.checked }))}
                  className="accent-[#0df20d]" />
                نشط
              </label>
              {channelError && <p className="rounded-lg bg-red-400/10 px-3 py-2 text-sm text-red-400">{channelError}</p>}
              <div className="flex gap-3">
                <button type="submit" disabled={channelSaving}
                  className="flex-1 cursor-pointer rounded-xl bg-[#0df20d] py-2.5 text-sm font-bold text-slate-900 hover:opacity-90 disabled:opacity-50">
                  {channelSaving ? 'جاري الحفظ...' : 'حفظ'}
                </button>
                <button type="button" onClick={() => setShowChannelForm(false)}
                  className="flex-1 cursor-pointer rounded-xl border border-white/10 py-2.5 text-sm font-bold text-slate-400 hover:text-white">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
