'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useMemberAuth } from '@/context/MemberAuthContext';
import { getAllElections, checkMyVote } from '@/features/elections/api.client';
import { BackendElection, BackendElectionType, BackendElectionStatus } from '@/types/elections';

function typeLabel(type: BackendElectionType): string {
  if (type === 'general_vote') return 'استفتاء';
  if (type === 'board_election') return 'انتخابات مجلس الإدارة';
  return 'انتخابات لجنة';
}

function BallotIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

interface ElectionRow extends BackendElection {
  hasVoted?: boolean;
}

export default function DashboardElectionsPage() {
  const { getAccessToken } = useMemberAuth();
  const [elections, setElections] = useState<ElectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    async function load() {
      const all = await getAllElections();
      const visible = all.filter(
        (e) => e.status === 'active' || e.status === 'completed',
      );

      const token = await getAccessToken();
      let rows: ElectionRow[] = visible;

      if (token) {
        rows = await Promise.all(
          visible.map(async (e) => ({
            ...e,
            hasVoted: await checkMyVote(e.id, token),
          })),
        );
      }

      if (mounted) { setElections(rows); setLoading(false); }
    }
    void load().catch(() => { if (mounted) { setError('تعذّر تحميل الانتخابات.'); setLoading(false); } });
    return () => { mounted = false; };
  }, [getAccessToken]);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 h-8 w-32 animate-pulse rounded-lg bg-white/10" />
        <ul className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <li key={i} className="flex items-start gap-4 rounded-xl border border-white/10 bg-[#071a07] p-5">
              <div className="mt-0.5 h-8 w-8 shrink-0 animate-pulse rounded-full bg-white/10" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 animate-pulse rounded bg-white/10" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-white/5" />
              </div>
              <div className="h-8 w-16 shrink-0 animate-pulse rounded-lg bg-white/10" />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-white">الانتخابات</h1>

      {error && <p className="text-red-400">{error}</p>}

      {!error && elections.length === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-[#071a07] px-8 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/5 text-slate-500">
            <BallotIcon />
          </div>
          <p className="text-slate-400">لا توجد عمليات تصويت متاحة حالياً.</p>
        </div>
      )}

      {elections.length > 0 && (
        <ul className="flex flex-col gap-3">
          {elections.map((e) => (
            <li
              key={e.id}
              className="flex items-start gap-4 rounded-xl border border-white/10 bg-[#071a07] p-5"
            >
              <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                e.status === 'active' ? 'bg-[#0df20d]/15 text-[#0df20d]' : 'bg-white/5 text-slate-500'
              }`}>
                <BallotIcon />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="font-semibold text-white leading-snug">{e.title}</p>
                  {e.status === 'active' && (
                    <span className="rounded-full bg-[#0df20d]/15 px-2 py-0.5 text-[10px] font-bold text-[#0df20d]">
                      جاري الآن
                    </span>
                  )}
                  {e.hasVoted && (
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                      صوّتَ
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">{typeLabel(e.type)}</p>
                {e.description && (
                  <p className="mt-1 text-sm text-slate-400 line-clamp-2">{e.description}</p>
                )}
              </div>

              <Link
                href={`/elections/${e.id}`}
                className={`shrink-0 cursor-pointer rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
                  e.status === 'active' && !e.hasVoted
                    ? 'bg-[#0df20d] text-slate-900 hover:bg-[#0be00b]'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                {e.status === 'active' && !e.hasVoted ? 'تصويت' : 'عرض'}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
