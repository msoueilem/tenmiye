'use client';

import { useEffect, useState } from 'react';
import type { Transaction, PaymentChannel, FinanceSummary, CreatePaymentChannelDto } from '@/types/finance';
import {
  getTransactions,
  getPaymentChannels,
  getFinanceSummary,
  createPaymentChannel,
  updatePaymentChannel,
  deletePaymentChannel,
  verifyTransaction,
} from '@/features/finance/api.client';

type Tab = 'summary' | 'channels' | 'transactions';

export default function AdminFinancePage() {
  const [tab, setTab] = useState<Tab>('summary');
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [channels, setChannels] = useState<PaymentChannel[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [channelForm, setChannelForm] = useState<CreatePaymentChannelDto>({ name: '', type: 'cash', isActive: true });
  const [editingChannel, setEditingChannel] = useState<PaymentChannel | null>(null);
  const [showChannelForm, setShowChannelForm] = useState(false);

  useEffect(() => {
    Promise.all([getFinanceSummary(new Date().getFullYear(), 'admin'), getPaymentChannels('admin'), getTransactions('admin')])
      .then(([s, c, t]) => {
        setSummary(s);
        setChannels(c);
        setTransactions(t);
      })
      .catch(() => setError('فشل تحميل البيانات المالية'));
  }, []);

  const handleVerify = async (id: string) => {
    setLoading(true);
    try {
      const updated = await verifyTransaction(id, 'admin');
      setTransactions((prev) => prev.map((t) => (t.id === id ? updated : t)));
    } catch {
      setError('فشل التحقق');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteChannel = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف قناة الدفع؟')) return;
    setLoading(true);
    try {
      await deletePaymentChannel(id, 'admin');
      setChannels((prev) => prev.filter((c) => c.id !== id));
    } catch {
      setError('فشل الحذف');
    } finally {
      setLoading(false);
    }
  };

  const handleChannelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (editingChannel) {
        const updated = await updatePaymentChannel(editingChannel.id, channelForm, 'admin');
        setChannels((prev) => prev.map((c) => (c.id === editingChannel.id ? updated : c)));
      } else {
        const created = await createPaymentChannel(channelForm, 'admin');
        setChannels((prev) => [...prev, created]);
      }
      setChannelForm({ name: '', type: 'cash', isActive: true });
      setEditingChannel(null);
      setShowChannelForm(false);
    } catch {
      setError('فشل الحفظ');
    } finally {
      setLoading(false);
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'summary', label: 'الملخص' },
    { key: 'channels', label: 'قنوات الدفع' },
    { key: 'transactions', label: 'المعاملات' },
  ];

  return (
    <div className="p-6" dir="rtl">
      <h1 className="mb-6 text-xl font-bold text-[#d4af37]">الشؤون المالية</h1>
      {error && <p className="mb-4 text-red-400">{error}</p>}

      <div className="mb-6 flex gap-2 border-b border-white/10">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm ${
              tab === t.key
                ? 'border-b-2 border-[#d4af37] text-[#d4af37]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'summary' && summary && (
        <div className="space-y-4 max-w-lg">
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg bg-white/5 p-4 text-center">
              <p className="mb-1 text-xs text-slate-400">المساهمات</p>
              <p className="text-lg font-bold text-green-400">
                {summary.totals.contribution} {summary.currency}
              </p>
            </div>
            <div className="rounded-lg bg-white/5 p-4 text-center">
              <p className="mb-1 text-xs text-slate-400">التبرعات</p>
              <p className="text-lg font-bold text-green-300">
                {summary.totals.donation} {summary.currency}
              </p>
            </div>
            <div className="rounded-lg bg-white/5 p-4 text-center">
              <p className="mb-1 text-xs text-slate-400">المصروفات</p>
              <p className="text-lg font-bold text-red-400">
                {summary.totals.expense} {summary.currency}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-white/5 p-4 text-center">
              <p className="mb-1 text-xs text-slate-400">إجمالي الدخل</p>
              <p className="text-lg font-bold text-green-400">
                {summary.income} {summary.currency}
              </p>
            </div>
            <div className="rounded-lg bg-white/5 p-4 text-center">
              <p className="mb-1 text-xs text-slate-400">الصافي</p>
              <p className={`text-lg font-bold ${summary.net >= 0 ? 'text-[#d4af37]' : 'text-red-400'}`}>
                {summary.net} {summary.currency}
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-500">سنة {summary.year}{summary.month ? ` — شهر ${summary.month}` : ''}</p>
        </div>
      )}

      {tab === 'channels' && (
        <div>
          <div className="mb-4 flex justify-between">
            <span className="font-medium text-white">قنوات الدفع</span>
            <button
              onClick={() => {
                setShowChannelForm(true);
                setEditingChannel(null);
                setChannelForm({ name: '', type: 'cash', isActive: true });
              }}
              className="rounded-lg bg-[#d4af37] px-3 py-1.5 text-sm font-bold text-slate-900 hover:bg-[#c9a227]"
            >
              + إضافة قناة
            </button>
          </div>
          {showChannelForm && (
            <form onSubmit={handleChannelSubmit} className="mb-4 flex flex-col gap-3 rounded-lg border border-slate-700 bg-slate-900/30 p-4">
              <div className="grid grid-cols-2 gap-3">
                <input
                  className="rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-2 text-white outline-none focus:ring-2 focus:ring-[#d4af37]/30"
                  placeholder="اسم القناة"
                  value={channelForm.name}
                  onChange={(e) => setChannelForm((p) => ({ ...p, name: e.target.value }))}
                  required
                />
                <select
                  className="rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-2 text-white outline-none focus:ring-2 focus:ring-[#d4af37]/30"
                  value={channelForm.type}
                  onChange={(e) => setChannelForm((p) => ({ ...p, type: e.target.value as 'mobile' | 'cash' }))}
                  required
                >
                  <option value="cash">نقدي</option>
                  <option value="mobile">محفظة رقمية</option>
                </select>
              </div>
              {channelForm.type === 'mobile' && (
                <div className="grid grid-cols-2 gap-3">
                  <input
                    className="rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-2 text-white outline-none focus:ring-2 focus:ring-[#d4af37]/30"
                    placeholder="رقم المحفظة"
                    value={channelForm.walletNumber ?? ''}
                    onChange={(e) => setChannelForm((p) => ({ ...p, walletNumber: e.target.value }))}
                    required
                  />
                  <input
                    className="rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-2 text-white outline-none focus:ring-2 focus:ring-[#d4af37]/30"
                    placeholder="اسم صاحب المحفظة"
                    value={channelForm.walletOwner ?? ''}
                    onChange={(e) => setChannelForm((p) => ({ ...p, walletOwner: e.target.value }))}
                    required
                  />
                </div>
              )}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={channelForm.isActive ?? true}
                    onChange={(e) => setChannelForm((p) => ({ ...p, isActive: e.target.checked }))}
                  />
                  نشط
                </label>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-lg bg-[#d4af37] px-4 py-2 font-bold text-slate-900 hover:bg-[#c9a227] disabled:opacity-50"
                  >
                    حفظ
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowChannelForm(false)}
                    className="rounded-lg border border-slate-700 px-4 py-2 text-slate-400 hover:text-white"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </form>
          )}
          <div className="space-y-2">
            {channels.map((ch) => (
              <div
                key={ch.id}
                className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3"
              >
                <span className="text-white">{ch.name}</span>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setEditingChannel(ch);
                      setChannelForm({
                        name: ch.name,
                        type: ch.type,
                        walletNumber: ch.walletNumber,
                        walletOwner: ch.walletOwner,
                        isActive: ch.isActive,
                      });
                      setShowChannelForm(true);
                    }}
                    className="text-sm text-[#d4af37] hover:underline"
                  >
                    تعديل
                  </button>
                  <button
                    onClick={() => handleDeleteChannel(ch.id)}
                    disabled={loading}
                    className="text-sm text-red-400 hover:underline disabled:opacity-50"
                  >
                    حذف
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'transactions' && (
        <div className="space-y-2">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3"
            >
              <div>
                <p className="text-sm text-white">{tx.description ?? tx.type}</p>
                <p className="text-xs text-slate-400">
                  {tx.amount} {tx.currency} •{' '}
                  <span
                    className={
                      tx.status === 'verified'
                        ? 'text-green-400'
                        : tx.status === 'rejected'
                          ? 'text-red-400'
                          : 'text-yellow-400'
                    }
                  >
                    {tx.status === 'verified' ? 'موثق' : tx.status === 'rejected' ? 'مرفوض' : 'معلق'}
                  </span>
                </p>
              </div>
              {tx.status === 'pending' && (
                <button
                  onClick={() => handleVerify(tx.id)}
                  disabled={loading}
                  className="text-sm text-green-400 hover:underline disabled:opacity-50"
                >
                  توثيق
                </button>
              )}
            </div>
          ))}
          {transactions.length === 0 && (
            <p className="py-8 text-center text-slate-500">لا توجد معاملات</p>
          )}
        </div>
      )}
    </div>
  );
}
