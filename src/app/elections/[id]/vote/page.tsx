'use client';

import React, { useState, useEffect, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useMemberAuth } from '@/context/MemberAuthContext';
import { apiFetch } from '@/lib/api';
import {
  getElectionById,
  getElectionResults,
  castVoteApi,
  checkMyVote,
} from '@/features/elections/api.client';
import { Election, ElectionResults, PublicMember } from '@/types/elections';
import { Card } from '@/components/ui/Card';
import { AlertBox } from '@/components/ui/AlertBox';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { VoteOptionsYesNo } from '@/features/elections/components/VoteOptionsYesNo';
import { ResultsYesNo } from '@/features/elections/components/ResultsYesNo';

function resultsToStats(results: ElectionResults['results']): Record<string, number> {
  return results.reduce<Record<string, number>>((acc, r) => {
    acc[r.selection] = r.count;
    return acc;
  }, {});
}

export default function VotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: electionId } = use(params);
  const router = useRouter();
  const { getAccessToken, user } = useMemberAuth();

  const [election, setElection] = useState<Election | null>(null);
  const [results, setResults] = useState<ElectionResults | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(true);

  const [selections, setSelections] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Member search for board/committee elections
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PublicMember[]>([]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const [el, res] = await Promise.all([
        getElectionById(electionId),
        getElectionResults(electionId),
      ]);
      if (!mounted) return;
      setElection(el);
      setResults(res);

      const token = await getAccessToken();
      if (token && el) {
        const voted = await checkMyVote(electionId, token);
        if (mounted) setHasVoted(voted);
      }
      if (mounted) setLoading(false);
    }
    void load();
    return () => { mounted = false; };
  }, [electionId, getAccessToken]);

  const handleSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) { setSearchResults([]); return; }
    try {
      const results = await apiFetch<PublicMember[]>('GET', `/me/members/search?q=${encodeURIComponent(trimmed)}`, { tokenType: 'member' });
      setSearchResults(results);
    } catch { /* ignore */ }
  }, []);

  const toggleMember = (uid: string) => {
    setSelections((prev) => (prev.includes(uid) ? prev.filter((x) => x !== uid) : [uid]));
  };

  const handleSubmit = async () => {
    const token = await getAccessToken();
    if (!token) {
      router.push(`/dashboard/login`);
      return;
    }
    setSubmitting(true);
    setError('');
    const result = await castVoteApi(electionId, selections, token);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error ?? 'حدث خطأ');
    } else {
      router.push(`/elections/${electionId}/thanks`);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-medium">جاري التحميل...</div>;
  }

  if (!election) {
    return <div className="p-8 text-center text-red-500 font-bold">الانتخابات غير موجودة.</div>;
  }

  const isActive = election.status === 'voting';
  const isVotingDisabled = !user || hasVoted || submitting || !isActive;
  const stats = results ? resultsToStats(results.results) : {};
  const isGeneralVote = election.type === 'yes_no';

  return (
    <div className="max-w-4xl mx-auto p-4 flex flex-col gap-8">
      {/* Header */}
      <Card>
        <h1 className="text-2xl font-bold mb-2 text-slate-800">{election.title}</h1>
        {election.description && <p className="text-slate-600 mb-4">{election.description}</p>}
        <div className="flex flex-col gap-2">
          {!isActive && <AlertBox variant="info">هذه الانتخابات غير نشطة حالياً.</AlertBox>}
          {hasVoted && <AlertBox variant="success">لقد قمت بالتصويت في هذه الانتخابات مسبقاً.</AlertBox>}
          {!user && isActive && <AlertBox variant="info">يجب تسجيل الدخول للمشاركة في التصويت.</AlertBox>}
          {error && <AlertBox variant="error">{error}</AlertBox>}
        </div>
      </Card>

      {/* Voting area */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-slate-800 border-b border-slate-100 pb-3">خيارات التصويت</h2>

        {isGeneralVote ? (
          <VoteOptionsYesNo
            disabled={isVotingDisabled}
            selections={selections}
            setSelections={setSelections}
          />
        ) : (
          <MemberSearchVote
            disabled={isVotingDisabled}
            selections={selections}
            onToggle={toggleMember}
            searchQuery={searchQuery}
            setSearchQuery={(q) => { setSearchQuery(q); void handleSearch(q); }}
            searchResults={searchResults}
          />
        )}

        <div className="mt-4">
          <PrimaryButton
            onClick={handleSubmit}
            disabled={isVotingDisabled || (!user ? false : selections.length === 0)}
            loading={submitting}
          >
            {!user ? 'تسجيل الدخول للتصويت' : 'تأكيد التصويت'}
          </PrimaryButton>
        </div>
      </Card>

      {/* Results */}
      {results && results.results.length > 0 && (
        <Card>
          <h2 className="text-xl font-bold mb-4 text-slate-800 border-b border-slate-100 pb-3">النتائج</h2>
          {isGeneralVote ? (
            <ResultsYesNo stats={stats} />
          ) : (
            <ResultsList results={results.results} />
          )}
        </Card>
      )}
    </div>
  );
}

function MemberSearchVote({
  disabled,
  selections,
  onToggle,
  searchQuery,
  setSearchQuery,
  searchResults,
}: {
  disabled: boolean;
  selections: string[];
  onToggle: (uid: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchResults: PublicMember[];
}) {
  return (
    <div className="flex flex-col gap-3 mb-4">
      <input
        type="text"
        placeholder="ابحث عن عضو بالاسم..."
        value={searchQuery}
        disabled={disabled}
        className="h-10 rounded-lg border border-slate-200 px-4 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-400 disabled:opacity-50"
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      {searchResults.map((m) => (
        <button
          key={m.id}
          disabled={disabled}
          onClick={() => onToggle(m.id)}
          className={`flex items-center gap-3 rounded-lg border p-3 text-right transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
            selections.includes(m.id)
              ? 'border-green-500 bg-green-50'
              : 'border-slate-200 hover:border-slate-400'
          }`}
        >
          <span className="flex-1 font-medium text-slate-900">{m.name}</span>
          {selections.includes(m.id) && (
            <span className="text-green-600 text-sm font-bold">✓ محدد</span>
          )}
        </button>
      ))}
      {selections.length > 0 && searchResults.length === 0 && (
        <p className="text-sm text-green-700 font-medium">تم اختيار عضو</p>
      )}
    </div>
  );
}

function ResultsList({ results }: { results: { selection: string; count: number }[] }) {
  const total = results.reduce((s, r) => s + r.count, 0);
  return (
    <div className="flex flex-col gap-3">
      {results.map((r) => (
        <div key={r.selection} className="flex flex-col gap-1">
          <div className="flex justify-between text-sm">
            <span className="font-mono text-xs text-slate-600 truncate max-w-xs">{r.selection}</span>
            <span className="font-bold text-slate-800">
              {r.count} ({total ? Math.round((r.count / total) * 100) : 0}%)
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-green-500 transition-all"
              style={{ width: `${total ? (r.count / total) * 100 : 0}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
