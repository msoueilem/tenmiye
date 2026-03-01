import { useEffect, useState, useRef } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { PublicMember } from '@/types/elections';

export function usePublicMembersByIds(uids: string[]) {
  const [members, setMembers] = useState<Record<string, PublicMember>>({});
  const [loading, setLoading] = useState(true);
  const cacheRef = useRef<Record<string, PublicMember>>({});

  // Stable sort and join for dependency array to prevent unnecessary re-runs
  const uidsKey = Array.from(new Set(uids)).sort().join(',');

  useEffect(() => {
    if (!uidsKey || !db) {
      setMembers({});
      setLoading(false);
      return;
    }

    let isMounted = true;
    const uniqueUids = uidsKey.split(',');

    const fetchMembers = async () => {
      setLoading(true);
      
      const uidsToFetch = uniqueUids.filter(uid => !cacheRef.current[uid]);

      if (uidsToFetch.length === 0) {
        // All requested UIDs are in cache
        if (isMounted) {
          const subset: Record<string, PublicMember> = {};
          uniqueUids.forEach(uid => {
            if (cacheRef.current[uid]) subset[uid] = cacheRef.current[uid];
          });
          setMembers(subset);
          setLoading(false);
        }
        return;
      }

      const results: Record<string, PublicMember> = {};
      
      try {
        // Fetch in batches of 10
        const batchSize = 10;
        for (let i = 0; i < uidsToFetch.length; i += batchSize) {
          const batchUids = uidsToFetch.slice(i, i + batchSize);
          const promises = batchUids.map(uid => getDoc(doc(db!, 'public-members', uid)));
          const snapshots = await Promise.all(promises);
          
          snapshots.forEach(snap => {
            if (snap.exists()) {
              results[snap.id] = { id: snap.id, ...snap.data() } as PublicMember;
            }
          });
        }
        
        if (isMounted) {
          cacheRef.current = { ...cacheRef.current, ...results };
          const subset: Record<string, PublicMember> = {};
          uniqueUids.forEach(uid => {
            if (cacheRef.current[uid]) subset[uid] = cacheRef.current[uid];
          });
          setMembers(subset);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching members:', err);
        if (isMounted) setLoading(false);
      }
    };

    fetchMembers();
    return () => { isMounted = false; };
  }, [uidsKey]);

  return { members, loading };
}