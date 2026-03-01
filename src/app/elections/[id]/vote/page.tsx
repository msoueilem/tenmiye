'use client';

import React, { useState, use, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/client';
import { submitVoteAction } from '@/features/elections/actions';
import { useElection } from '@/features/elections/hooks/useElection';
import { useMyVote } from '@/features/elections/hooks/useMyVote';
import { useNominationTop } from '@/features/elections/hooks/useNominationTop';
import { usePublicMembersByIds } from '@/features/members/hooks/usePublicMembersByIds';
import { PublicMember } from '@/types/elections';

// UI Components
import { Card } from '@/components/ui/Card';
import { AlertBox } from '@/components/ui/AlertBox';
import { PrimaryButton } from '@/components/ui/PrimaryButton';

// Feature Components
import { VoteOptionsYesNo } from '@/features/elections/components/VoteOptionsYesNo';
import { VoteOptionsPickMember } from '@/features/elections/components/VoteOptionsPickMember';
import { VoteOptionsNomination } from '@/features/elections/components/VoteOptionsNomination';
import { ResultsYesNo } from '@/features/elections/components/ResultsYesNo';
import { ResultsPickMember } from '@/features/elections/components/ResultsPickMember';
import { ResultsNomination } from '@/features/elections/components/ResultsNomination';

export default function VotePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const electionId = resolvedParams.id;
  const router = useRouter();

  const { election, loading: electionLoading } = useElection(electionId);
  const { hasVoted, user, loading: voteLoading } = useMyVote(electionId);
  const { topNominations } = useNominationTop(electionId);

  const [selections, setSelections] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // For NOMINATION search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PublicMember[]>([]);
  const searchReqRef = React.useRef(0);

  // Collect UIDs to fetch member profiles for results/voting UI
  const uidsToFetch = useMemo(() => {
    if (!election) return [];
    const uids = new Set<string>();
    if (election.type === 'PICK_MEMBER' && election.config?.pickMember?.candidateUids) {
      election.config.pickMember.candidateUids.forEach((uid: string) => uids.add(uid));
    }
    if (election.type === 'NOMINATION') {
      topNominations.forEach((nom: any) => uids.add(nom.nomineeUid));
      selections.forEach(uid => uids.add(uid));
    }
    return Array.from(uids);
  }, [election, topNominations, selections]);

  const { members } = usePublicMembersByIds(uidsToFetch);

  const handleSearch = useCallback(async (qStr: string) => {
    if (!db) return;
    
    searchReqRef.current += 1;
    const currentReqId = searchReqRef.current;

    const trimmed = qStr.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const q = query(
        collection(db, 'public-members'),
        where('status', '==', 'active'),
        orderBy('name'),
        where('name', '>=', trimmed),
        where('name', '<=', trimmed + '\uf8ff')
      );
      const snap = await getDocs(q);
      
      // Only apply results if this request is still the latest
      if (searchReqRef.current === currentReqId) {
        setSearchResults(snap.docs.map(d => ({ id: d.id, ...d.data() }) as PublicMember));
      }
    } catch (err) {
      console.error('Search error:', err);
    }
  }, []);

  const toggleSelection = (id: string, max: number) => {
    setSelections(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= max) return prev;
      return [...prev, id];
    });
  };

  const handleSubmit = async () => {
    if (!user) {
      router.push(`/elections/${electionId}/login`);
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      if (!auth?.currentUser) throw new Error('Authentication not initialized');
      const idToken = await auth.currentUser.getIdToken(true);
      const result = await submitVoteAction({
        electionId,
        selections,
        idToken,
      });

      if (!result.success) {
        setError(result.error || 'حدث خطأ غير معروف');
      } else {
        setSuccess(true);
        router.push(`/elections/${electionId}/thanks`);
      }
    } catch (err) {
      setError('تعذر الاتصال بالخادم.');
    } finally {
      setSubmitting(false);
    }
  };

  if (electionLoading || voteLoading) {
    return <div className="p-8 text-center text-slate-500 font-medium">جاري التحميل...</div>;
  }

  if (!election) {
    return <div className="p-8 text-center text-red-500 font-bold">الانتخابات غير موجودة.</div>;
  }

  const isVotingDisabled = !user || hasVoted || success || submitting || election.status !== 'active';

  return (
    <div className="max-w-4xl mx-auto p-4 flex flex-col gap-8">
      {/* Header Card */}
      <Card>
        <h1 className="text-2xl font-bold mb-2 text-slate-800">{election.title || 'تصويت'}</h1>
        <p className="text-slate-600 mb-4">{election.description}</p>
        
        <div className="flex flex-col gap-2">
          {election.status !== 'active' && (
            <AlertBox variant="info">هذه الانتخابات غير نشطة حالياً.</AlertBox>
          )}
          {hasVoted && <AlertBox variant="success">لقد قمت بالتصويت في هذه الانتخابات مسبقاً.</AlertBox>}
          {success && <AlertBox variant="success">تم إرسال تصويتك بنجاح!</AlertBox>}
          {error && <AlertBox variant="error">{error}</AlertBox>}
        </div>
      </Card>

      {/* Voting Area Card */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-slate-800 border-b border-slate-100 pb-3">خيارات التصويت</h2>
        
        {election.type === 'YES_NO' && (
          <VoteOptionsYesNo 
            disabled={isVotingDisabled} 
            selections={selections} 
            setSelections={setSelections} 
          />
        )}

        {election.type === 'PICK_MEMBER' && (
          <VoteOptionsPickMember
            disabled={isVotingDisabled}
            selections={selections}
            onToggle={toggleSelection}
            candidateUids={election.config?.pickMember?.candidateUids || []}
            maxSelections={election.config?.pickMember?.maxSelections || 1}
            members={members}
          />
        )}

        {election.type === 'NOMINATION' && (
          <VoteOptionsNomination
            disabled={isVotingDisabled}
            selections={selections}
            onToggle={toggleSelection}
            minPicks={election.config?.nomination?.minPicks || 1}
            maxPicks={election.config?.nomination?.maxPicks || 1}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchResults={searchResults}
            onSearch={handleSearch}
            members={members}
          />
        )}

        <PrimaryButton 
          onClick={handleSubmit} 
          disabled={isVotingDisabled || (!user ? false : selections.length === 0)}
          loading={submitting}
        >
          {!user ? 'تسجيل الدخول للتصويت' : 'تأكيد التصويت'}
        </PrimaryButton>
      </Card>

      {/* Results Panel Card */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-slate-800 border-b border-slate-100 pb-3">النتائج المباشرة</h2>
        
        {election.type === 'YES_NO' && <ResultsYesNo stats={election.stats} />}
        
        {election.type === 'PICK_MEMBER' && (
          <ResultsPickMember 
            candidateUids={election.config?.pickMember?.candidateUids || []} 
            stats={election.stats} 
            members={members} 
          />
        )}

        {election.type === 'NOMINATION' && (
          <ResultsNomination 
            topNominations={topNominations} 
            members={members} 
          />
        )}
      </Card>
    </div>
  );
}