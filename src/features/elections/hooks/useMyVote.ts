import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase/client';
import { onAuthStateChanged, User } from 'firebase/auth';

export function useMyVote(electionId: string) {
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!auth) return;
    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setHasVoted(false);
        setLoading(false);
      }
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!user || !electionId || !db) return;
    const voteId = `${electionId}_${user.uid}`;
    const unsubscribe = onSnapshot(doc(db, 'votes-simple', voteId), (doc) => {
      setHasVoted(doc.exists());
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user, electionId]);

  return { hasVoted, loading, user };
}