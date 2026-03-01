import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Election } from '@/types/elections';

export function useElection(electionId: string) {
  const [election, setElection] = useState<Election | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!electionId || !db) return;
    const unsubscribe = onSnapshot(doc(db, 'elections-simple', electionId), (doc) => {
      if (doc.exists()) {
        setElection({ id: doc.id, ...doc.data() } as Election);
      } else {
        setElection(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [electionId]);

  return { election, loading };
}