'use server';

import { adminAuth, adminDb } from '@/lib/firebase/admin';
import * as admin from 'firebase-admin';

interface SubmitVoteInput {
  electionId: string;
  selections: string[];
  idToken: string;
}

export async function submitVoteAction({ electionId, selections, idToken }: SubmitVoteInput) {
  try {
    // 1. Verify caller via ID token
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const voterUid = decodedToken.uid;

    await adminDb.runTransaction(async (transaction) => {
      const electionRef = adminDb.collection('elections-simple').doc(electionId);
      const voteRef = adminDb.collection('votes-simple').doc(`${electionId}_${voterUid}`);

      // 2. Execute all reads before any writes
      const electionSnap = await transaction.get(electionRef);
      const voteSnap = await transaction.get(voteRef);

      // Core Validations
      if (!electionSnap.exists) throw new Error('الانتخابات غير موجودة.');
      if (voteSnap.exists) throw new Error('لقد قمت بالتصويت مسبقاً.');

      const election = electionSnap.data()!;
      if (election.status !== 'active') throw new Error('هذه الانتخابات غير نشطة حالياً.');

      const nowMillis = admin.firestore.Timestamp.now().toMillis();
      if (election.startTime && nowMillis < election.startTime.toMillis()) {
        throw new Error('التصويت لم يبدأ بعد.');
      }
      if (election.endTime && nowMillis > election.endTime.toMillis()) {
        throw new Error('انتهى وقت التصويت.');
      }

      const uniqueSelections = Array.from(new Set(selections));
      if (uniqueSelections.length === 0) throw new Error('يجب اختيار خيار واحد على الأقل.');

      const type = election.type;

      // 3. Type-Specific Validation and Writes
      if (type === 'YES_NO') {
        if (uniqueSelections.length !== 1 || !['yes', 'no'].includes(uniqueSelections[0])) {
          throw new Error('خيار غير صالح لتصويت نعم/لا.');
        }
        
        transaction.update(electionRef, {
          [`stats.${uniqueSelections[0]}`]: admin.firestore.FieldValue.increment(1)
        });

      } else if (type === 'PICK_MEMBER') {
        const config = election.config?.pickMember || {};
        const maxSelections = config.maxSelections || 1;
        const candidateUids = config.candidateUids || [];

        if (uniqueSelections.length > maxSelections) {
          throw new Error(`يمكنك اختيار ${maxSelections} كحد أقصى.`);
        }

        const updates: Record<string, any> = {};
        for (const uid of uniqueSelections) {
          if (!candidateUids.includes(uid)) {
            throw new Error(`المرشح غير متاح في هذه الانتخابات.`);
          }
          updates[`stats.${uid}`] = admin.firestore.FieldValue.increment(1);
        }

        if (Object.keys(updates).length > 0) {
          transaction.update(electionRef, updates);
        }

      } else if (type === 'NOMINATION') {
        const config = election.config?.nomination || {};
        const minPicks = config.minPicks || 1;
        const maxPicks = config.maxPicks || 1;

        if (uniqueSelections.length < minPicks || uniqueSelections.length > maxPicks) {
          throw new Error(`يجب اختيار بين ${minPicks} و ${maxPicks} أعضاء.`);
        }

        // Additional read needed for NOMINATION (safe since no writes have occurred yet in this transaction)
        const nomineeRefs = uniqueSelections.map((uid: string) => adminDb.collection('public-members').doc(uid));
        const nomineeSnaps = await transaction.getAll(...nomineeRefs);

        for (let i = 0; i < nomineeSnaps.length; i++) {
          const snap = nomineeSnaps[i];
          if (!snap.exists || snap.data()?.status !== 'active') {
            throw new Error(`العضو المختار غير موجود أو غير نشط.`);
          }
        }

        for (const nomineeUid of uniqueSelections) {
          // Add to private nominations log
          const nomRef = adminDb.collection('nominations-simple').doc(`${electionId}_${voterUid}_${nomineeUid}`);
          transaction.set(nomRef, {
            electionId,
            voterUid,
            nomineeUid,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });

          // Update public tally
          const countRef = adminDb.collection('nomination-counts').doc(`${electionId}_${nomineeUid}`);
          transaction.set(countRef, {
            electionId,
            nomineeUid,
            count: admin.firestore.FieldValue.increment(1)
          }, { merge: true });
        }
      } else {
        throw new Error('نوع الانتخابات غير صالح.');
      }

      // 4. Mark user as voted
      transaction.set(voteRef, {
        electionId,
        voterUid,
        selections: uniqueSelections,
        votedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
