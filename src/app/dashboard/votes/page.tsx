'use client';

import { useEffect, useState } from 'react';
import { useMemberAuth } from '@/context/MemberAuthContext';
import { memberFetch } from '@/lib/memberApi';

interface VoteRecord {
  id: string;
  electionId: string;
  electionTitle: string;
  selection: string | null;
  nomineeId: string | null;
  createdAt: { seconds: number } | null;
}

function formatDate(createdAt: VoteRecord['createdAt']): string {
  if (!createdAt?.seconds) return '—';
  return new Date(createdAt.seconds * 1000).toLocaleDateString('ar-MR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function VoteIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

export default function VotesPage() {
  const { getAccessToken } = useMemberAuth();
  const [votes, setVotes] = useState<VoteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    async function load() {
      const token = await getAccessToken();
      if (!token) return;
      const res = await memberFetch('/me/votes', token);
      if (!res.ok) { setError('تعذّر تحميل سجل الأصوات.'); return; }
      const data = (await res.json()) as VoteRecord[];
      if (mounted) setVotes(data);
    }
    void load().finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [getAccessToken]);

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0df20d] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-white">سجل الأصوات</h1>

      {error && <p className="text-red-400">{error}</p>}

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
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white leading-snug">{vote.electionTitle}</p>
                {vote.selection && (
                  <p className="mt-1 text-sm text-slate-400">
                    الاختيار: <span className="text-slate-200">{vote.selection}</span>
                  </p>
                )}
                {vote.nomineeId && (
                  <p className="mt-1 text-sm text-slate-400">
                    المرشح: <span className="text-slate-200 font-mono text-xs">{vote.nomineeId}</span>
                  </p>
                )}
                <p className="mt-2 text-xs text-slate-600">{formatDate(vote.createdAt)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
