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
  submitNominationsApi,
  dismissSelfApi,
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
  const [success, setSuccess] = useState('');

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
      const res = await apiFetch<PublicMember[]>('GET', `/me/members/search?q=${encodeURIComponent(trimmed)}`, { tokenType: 'member' });
      setSearchResults(res);
    } catch { /* ignore */ }
  }, []);

  const toggleMember = (uid: string, max: number) => {
    setSelections((prev) => {
      if (prev.includes(uid)) return prev.filter((x) => x !== uid);
      if (prev.length >= max) return prev;
      return [...prev, uid];
    });
  };

  const handleSubmitNominations = async () => {
    const token = await getAccessToken();
    if (!token) { router.push('/dashboard/login'); return; }
    setSubmitting(true);
    setError('');
    const result = await submitNominationsApi(electionId, selections);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error ?? 'حدث خطأ');
    } else {
      setSuccess('تم تقديم ترشيحاتك بنجاح!');
      setSelections([]);
    }
  };

  const handleDismissSelf = async () => {
    const token = await getAccessToken();
    if (!token) { router.push('/dashboard/login'); return; }
    setSubmitting(true);
    setError('');
    const result = await dismissSelfApi(electionId);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error ?? 'حدث خطأ');
    } else {
      setSuccess('تم تسجيل انسحابك من الترشيح.');
    }
  };

  const handleSubmitVote = async () => {
    const token = await getAccessToken();
    if (!token) { router.push('/dashboard/login'); return; }
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

  const seatsCount = election.boardConfig?.seatsCount ?? 1;
  const isNomination = election.status === 'nomination';
  const isDismissal = election.status === 'dismissal';
  const isVoting = election.status === 'voting';
  const isCompleted = election.status === 'completed';
  const isActive = isNomination || isDismissal || isVoting;

  const myUserId = user?.userId;
  const amNominee = isDismissal && myUserId
    ? (election.nominees ?? []).some((n) => n.userId === myUserId && n.status === 'pending')
    : false;

  const stats = results ? resultsToStats(results.results) : {};
  const isGeneralVote = election.type === 'yes_no';

  // Phase labels
  const phaseLabel = isNomination
    ? 'مرحلة الترشيح'
    : isDismissal
    ? 'مرحلة الإقصاء'
    : isVoting
    ? 'مرحلة التصويت'
    : isCompleted
    ? 'انتهت الانتخابات'
    : 'الانتخابات';

  return (
    <div className="max-w-4xl mx-auto p-4 flex flex-col gap-8" dir="rtl">
      {/* Header */}
      <Card>
        <div className="flex items-center gap-3 mb-2">
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
            isVoting ? 'bg-green-100 text-green-700' :
            isNomination || isDismissal ? 'bg-blue-100 text-blue-700' :
            'bg-slate-100 text-slate-500'
          }`}>
            {phaseLabel}
          </span>
        </div>
        <h1 className="text-2xl font-bold mb-2 text-slate-800">{election.title}</h1>
        {election.description && <p className="text-slate-600 mb-4">{election.description}</p>}
        <div className="flex flex-col gap-2">
          {!isActive && !isCompleted && <AlertBox variant="info">هذه الانتخابات غير نشطة حالياً.</AlertBox>}
          {hasVoted && isVoting && <AlertBox variant="success">لقد قمت بالتصويت في هذه الانتخابات مسبقاً.</AlertBox>}
          {!user && isActive && <AlertBox variant="info">يجب تسجيل الدخول للمشاركة.</AlertBox>}
          {success && <AlertBox variant="success">{success}</AlertBox>}
          {error && <AlertBox variant="error">{error}</AlertBox>}
        </div>
      </Card>

      {/* ── Nomination phase ── */}
      {isNomination && (
        <Card>
          <h2 className="text-xl font-bold mb-2 text-slate-800 border-b border-slate-100 pb-3">
            رشّح أعضاءك للمجلس
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            اختر {seatsCount} {seatsCount === 1 ? 'عضواً' : 'أعضاء'} لترشيحهم.
            المحدد: {selections.length} / {seatsCount}
          </p>
          <MemberSearchPicker
            disabled={!user || !!success}
            selections={selections}
            onToggle={(uid) => toggleMember(uid, seatsCount)}
            searchQuery={searchQuery}
            setSearchQuery={(q) => { setSearchQuery(q); void handleSearch(q); }}
            searchResults={searchResults}
          />
          <div className="mt-4">
            <PrimaryButton
              onClick={handleSubmitNominations}
              disabled={!user || submitting || selections.length !== seatsCount || !!success}
              loading={submitting}
            >
              {!user ? 'سجّل الدخول للترشيح' : `تأكيد الترشيحات (${selections.length}/${seatsCount})`}
            </PrimaryButton>
          </div>
        </Card>
      )}

      {/* ── Dismissal phase ── */}
      {isDismissal && (
        <Card>
          <h2 className="text-xl font-bold mb-3 text-slate-800 border-b border-slate-100 pb-3">
            مرحلة الإقصاء
          </h2>
          {!user && <AlertBox variant="info">سجّل الدخول لمعرفة وضعك كمرشح.</AlertBox>}
          {user && !amNominee && !success && (
            <p className="text-slate-500 text-sm">أنت لست ضمن المرشحين في هذه المرحلة.</p>
          )}
          {user && amNominee && !success && (
            <div className="flex flex-col gap-3">
              <AlertBox variant="info">
                أنت مرشح في هذه الانتخابات. إذا كنت لا تريد المشاركة يمكنك الانسحاب.
              </AlertBox>
              <PrimaryButton
                onClick={handleDismissSelf}
                disabled={submitting}
                loading={submitting}
              >
                أنا لا أريد المشاركة — انسحب من الترشيح
              </PrimaryButton>
            </div>
          )}
        </Card>
      )}

      {/* ── Voting phase ── */}
      {isVoting && !hasVoted && (
        <Card>
          <h2 className="text-xl font-bold mb-4 text-slate-800 border-b border-slate-100 pb-3">
            خيارات التصويت
          </h2>
          {isGeneralVote ? (
            <VoteOptionsYesNo
              disabled={!user || hasVoted || submitting}
              selections={selections}
              setSelections={setSelections}
            />
          ) : (
            <>
              <p className="text-sm text-slate-500 mb-4">
                اختر {seatsCount} {seatsCount === 1 ? 'عضواً' : 'أعضاء'}.
                المحدد: {selections.length} / {seatsCount}
              </p>
              <MemberSearchPicker
                disabled={!user || hasVoted || submitting}
                selections={selections}
                onToggle={(uid) => toggleMember(uid, seatsCount)}
                searchQuery={searchQuery}
                setSearchQuery={(q) => { setSearchQuery(q); void handleSearch(q); }}
                searchResults={searchResults}
              />
            </>
          )}
          <div className="mt-4">
            <PrimaryButton
              onClick={handleSubmitVote}
              disabled={!user || hasVoted || submitting || selections.length === 0}
              loading={submitting}
            >
              {!user ? 'سجّل الدخول للتصويت' : 'تأكيد التصويت'}
            </PrimaryButton>
          </div>
        </Card>
      )}

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

function MemberAvatar({ member }: { member: PublicMember }) {
  const initials = (member.fullName || member.fullNameAr || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  if (member.photoUrl) {
    return (
      <img
        src={member.photoUrl}
        alt={member.fullName}
        className="h-10 w-10 rounded-full object-cover shrink-0 border border-slate-200"
      />
    );
  }
  return (
    <div className="h-10 w-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-sm font-bold shrink-0">
      {initials}
    </div>
  );
}

function MemberSearchPicker({
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
        placeholder="ابحث بالاسم (عربي أو فرنسي) أو رقم الهاتف..."
        value={searchQuery}
        disabled={disabled}
        className="h-11 rounded-lg border border-slate-200 px-4 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-400 disabled:opacity-50"
        onChange={(e) => setSearchQuery(e.target.value)}
        dir="auto"
      />
      {searchResults.map((m) => {
        const selected = selections.includes(m.id);
        return (
          <button
            key={m.id}
            disabled={disabled}
            onClick={() => onToggle(m.id)}
            className={`flex items-center gap-3 rounded-xl border p-3 text-right transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              selected ? 'border-green-500 bg-green-50' : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <MemberAvatar member={m} />

            <div className="flex-1 min-w-0">
              {/* Names */}
              <div className="flex flex-wrap items-baseline gap-x-2">
                {m.fullNameAr && (
                  <span className="font-semibold text-slate-900 text-sm" dir="rtl">{m.fullNameAr}</span>
                )}
                {m.fullNameFr && (
                  <span className={`text-sm ${m.fullNameAr ? 'text-slate-500' : 'font-semibold text-slate-900'}`}>
                    {m.fullNameFr}
                  </span>
                )}
                {!m.fullNameAr && !m.fullNameFr && (
                  <span className="font-semibold text-slate-900 text-sm">{m.fullName}</span>
                )}
              </div>

              {/* Contact info */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 mt-0.5">
                {m.whatsappNumber && (
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <svg viewBox="0 0 24 24" className="h-3 w-3 fill-green-500" xmlns="http://www.w3.org/2000/svg">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                    </svg>
                    {m.whatsappNumber}
                  </span>
                )}
                {m.phoneNumber && m.phoneNumber !== m.whatsappNumber && (
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <svg viewBox="0 0 24 24" className="h-3 w-3 fill-slate-400" xmlns="http://www.w3.org/2000/svg">
                      <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                    </svg>
                    {m.phoneNumber}
                  </span>
                )}
              </div>
            </div>

            {selected && (
              <span className="text-green-600 text-lg shrink-0">✓</span>
            )}
          </button>
        );
      })}
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
