import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { NominationCount } from '@/types/elections';

export function useNominationTop(electionId: string) {
  const [topNominations, setTopNominations] = useState<NominationCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!electionId || !db) return;
    const q = query(
      collection(db, 'nomination-counts'),
      where('electionId', '==', electionId),
      orderBy('count', 'desc'),
      limit(20)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NominationCount));
      setTopNominations(results);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [electionId]);

  return { topNominations, loading };
}