'use client';

import { useEffect, useState } from 'react';
import { useMemberAuth } from '@/context/MemberAuthContext';
import type { Transaction, PaymentChannel, FinanceSummary, CreateTransactionDto } from '@/types/finance';
import {
  getTransactions,
  getPaymentChannels,
  getFinanceSummary,
  createTransaction,
} from '@/features/finance/api.client';

type Tab = 'summary' | 'add' | 'history';

export default function MemberFinancePage() {
  const { user } = useMemberAuth();
  const permissions = user?.permissions ?? [];
  const canRead = permissions.includes('READ_FINANCE');
  const canContribute = permissions.includes('RECORD_CONTRIBUTIONS');
  const canExpense = permissions.includes('RECORD_EXPENSES');
  const canAdd = canContribute || canExpense;

  const [tab, setTab] = useState<Tab>('summary');
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [channels, setChannels] = useState<PaymentChannel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState<CreateTransactionDto>({
    type: 'contribution',
    amount: 0,
    currency: 'MRU',
    description: '',
  });

  useEffect(() => {
    if (!canRead) return;
    Promise.all([getFinanceSummary(), getTransactions(), getPaymentChannels()])
      .then(([s, t, c]) => {
        setSummary(s);
        setTransactions(t);
        setChannels(c);
      })
      .catch(() => setError('فشل تحميل البيانات المالية'));
  }, [canRead]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const created = await createTransaction(form);
      setTransactions((prev) => [created, ...prev]);
      setForm({ type: 'contribution', amount: 0, currency: 'MRU', description: '' });
      setSuccess('تم تسجيل المعاملة بنجاح');
      setTab('history');
    } catch {
      setError('فشل التسجيل');
    } finally {
      setLoading(false);
    }
  };

  if (!canRead) {
    return (
      <div className="py-8 text-center text-slate-400" dir="rtl">
        ليس لديك صلاحية الوصول إلى الشؤون المالية
      </div>
    );
  }

  const tabs: { key: Tab; label: string; show: boolean }[] = [
    { key: 'summary', label: 'الملخص', show: true },
    { key: 'add', label: 'تسجيل معاملة', show: canAdd },
    { key: 'history', label: 'السجل', show: true },
  ];

  return (
    <div dir="rtl">
      <h1 className="mb-6 text-xl font-bold text-[#0df20d]">الشؤون المالية</h1>
      {error && <p className="mb-4 text-red-400">{error}</p>}
      {success && <p className="mb-4 text-green-400">{success}</p>}

      <div className="mb-6 flex gap-2 border-b border-white/10">
        {tabs
          .filter((t) => t.show)
          .map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm ${
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
        <div className="grid max-w-lg grid-cols-3 gap-4">
          <div className="rounded-lg bg-white/5 p-4 text-center">
            <p className="mb-1 text-xs text-slate-400">المساهمات</p>
            <p className="text-lg font-bold text-green-400">
              {summary.totalContributions} {summary.currency}
            </p>
          </div>
          <div className="rounded-lg bg-white/5 p-4 text-center">
            <p className="mb-1 text-xs text-slate-400">المصروفات</p>
            <p className="text-lg font-bold text-red-400">
              {summary.totalExpenses} {summary.currency}
            </p>
          </div>
          <div className="rounded-lg bg-white/5 p-4 text-center">
            <p className="mb-1 text-xs text-slate-400">الرصيد</p>
            <p className="text-lg font-bold text-[#0df20d]">
              {summary.balance} {summary.currency}
            </p>
          </div>
        </div>
      )}

      {tab === 'add' && canAdd && (
        <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
          <select
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#0df20d]/30"
            value={form.type}
            onChange={(e) =>
              setForm((p) => ({ ...p, type: e.target.value as CreateTransactionDto['type'] }))
            }
          >
            {canContribute && <option value="contribution">مساهمة</option>}
            {canExpense && <option value="expense">مصروف</option>}
          </select>
          <input
            type="number"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#0df20d]/30"
            placeholder="المبلغ"
            min={0}
            value={form.amount || ''}
            onChange={(e) => setForm((p) => ({ ...p, amount: parseFloat(e.target.value) || 0 }))}
            required
          />
          <select
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#0df20d]/30"
            value={form.currency}
            onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))}
          >
            <option value="MRU">أوقية موريتانية (MRU)</option>
            <option value="USD">دولار أمريكي (USD)</option>
            <option value="EUR">يورو (EUR)</option>
          </select>
          {channels.filter((c) => c.isActive).length > 0 && (
            <select
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#0df20d]/30"
              value={form.paymentChannelId ?? ''}
              onChange={(e) =>
                setForm((p) => ({ ...p, paymentChannelId: e.target.value || undefined }))
              }
            >
              <option value="">قناة الدفع (اختياري)</option>
              {channels
                .filter((c) => c.isActive)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          )}
          <textarea
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#0df20d]/30"
            placeholder="الوصف (اختياري)"
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            rows={2}
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-[#0df20d] px-4 py-3 font-bold text-slate-900 hover:bg-[#0be00b] disabled:opacity-50"
          >
            {loading ? 'جاري التسجيل...' : 'تسجيل'}
          </button>
        </form>
      )}

      {tab === 'history' && (
        <div className="space-y-2">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="rounded-lg border border-white/10 bg-white/5 p-3"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-white">{tx.description ?? tx.type}</p>
                <p className="text-sm font-semibold text-[#0df20d]">
                  {tx.amount} {tx.currency}
                </p>
              </div>
              <p className="mt-1 text-xs text-slate-400">
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
                {' • '}
                {tx.createdAt.slice(0, 10)}
              </p>
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
