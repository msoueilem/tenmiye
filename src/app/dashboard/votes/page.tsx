'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

interface FirestoreTimestamp {
  seconds?: number;
  _seconds?: number;
  nanoseconds?: number;
  _nanoseconds?: number;
}

interface VoteRecord {
  id: string;
  electionId: string;
  electionTitle: string;
  electionType: string;
  choices: string[];
  castAt: FirestoreTimestamp | string | null;
}

function formatDate(castAt: VoteRecord['castAt']): string {
  if (!castAt) return '—';
  if (typeof castAt === 'string') {
    const d = new Date(castAt);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('ar-MR', { year: 'numeric', month: 'long', day: 'numeric' });
  }
  const seconds = (castAt as FirestoreTimestamp)._seconds ?? (castAt as FirestoreTimestamp).seconds ?? 0;
  if (!seconds) return '—';
  return new Date(seconds * 1000).toLocaleDateString('ar-MR', { year: 'numeric', month: 'long', day: 'numeric' });
}

function typeLabel(type: string): string {
  if (type === 'yes_no') return 'استفتاء نعم / لا';
  if (type === 'multiple_choice') return 'اختيار متعدد';
  if (type === 'board') return 'انتخابات مجلس';
  return type;
}

function VoteIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

export default function VotesPage() {
  const [votes, setVotes] = useState<VoteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const data = await apiFetch<VoteRecord[]>('GET', '/me/votes', { tokenType: 'member' });
        if (mounted) setVotes(data);
      } catch {
        if (mounted) setError('تعذّر تحميل سجل الأصوات.');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void load();
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 h-8 w-40 animate-pulse rounded-lg bg-white/10" />
        <ul className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <li key={i} className="flex items-start gap-4 rounded-xl border border-white/10 bg-[#071a07] p-5">
              <div className="mt-0.5 h-8 w-8 shrink-0 animate-pulse rounded-full bg-white/10" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 animate-pulse rounded bg-white/10" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-white/5" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-white">سجل الأصوات</h1>

      {error && <p className="mb-4 text-red-400">{error}</p>}

      {!error && votes.length === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-[#071a07] px-8 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/5 text-slate-500">
            <VoteIcon />
          </div>
          <p className="text-slate-400">لم تشارك في أي تصويت حتى الآن.</p>
        </div>
      )}

      {votes.length > 0 && (
        <ul className="flex flex-col gap-3">
          {votes.map((vote) => (
            <li
              key={vote.id}
              className="flex items-start gap-4 rounded-xl border border-white/10 bg-[#071a07] p-5"
            >
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0df20d]/15 text-[#0df20d]">
                <VoteIcon />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold leading-snug text-white">{vote.electionTitle}</p>
                <p className="mt-0.5 text-xs text-slate-500">{typeLabel(vote.electionType)}</p>
                {vote.choices.length > 0 && (
                  <p className="mt-1 text-sm text-slate-400">
                    الاختيار:{' '}
                    <span className="text-slate-200">{vote.choices.join('، ')}</span>
                  </p>
                )}
                <p className="mt-2 text-xs text-slate-600">{formatDate(vote.castAt)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
