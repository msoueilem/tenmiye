import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { FirebaseService } from '../../common/firebase/firebase.service';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

@Injectable()
export class ElectionsScheduler {
  private readonly logger = new Logger(ElectionsScheduler.name);

  constructor(private readonly firebase: FirebaseService) {}

  @Cron('*/5 * * * *')
  async handleWithdrawalWindowClose(): Promise<void> {
    const now = Timestamp.now();

    const stagesSnapshot = await this.firebase.db
      .collection('electionStages')
      .where('stageType', '==', 'WITHDRAWAL')
      .where('status', '==', 'ACTIVE')
      .where('closesAt', '<=', now)
      .get();

    for (const stageDoc of stagesSnapshot.docs) {
      try {
        const stage = stageDoc.data() as {
          processId: string;
          closesAt: Timestamp;
        };

        const optionsSnapshot = await this.firebase.db
          .collection('electionOptions')
          .where('stageId', '==', stageDoc.id)
          .where('outcome', '==', 'PENDING')
          .where('tier', '==', 'SHORTLIST')
          .get();

        const TARGET = 5;
        const count = optionsSnapshot.size;

        if (count === TARGET) {
          const batch = this.firebase.db.batch();
          for (const opt of optionsSnapshot.docs) {
            batch.update(opt.ref, { outcome: 'ELECTED' });
          }
          batch.update(stageDoc.ref, { status: 'CLOSED' });
          batch.update(
            this.firebase.db.collection('electionProcesses').doc(stage.processId),
            { status: 'COMPLETED' },
          );
          await batch.commit();
        } else if (count > TARGET) {
          await this.firebase.db.runTransaction(async (tx) => {
            tx.update(stageDoc.ref, { status: 'CLOSED' });
            const newStageRef = this.firebase.db.collection('electionStages').doc();
            tx.set(newStageRef, {
              stageType: 'FINAL_VOTE',
              status: 'ACTIVE',
              processId: stage.processId,
              createdAt: FieldValue.serverTimestamp(),
            });
          });
        } else {
          // count < TARGET
          const needed = TARGET - count;

          const reserveSnapshot = await this.firebase.db
            .collection('electionOptions')
            .where('stageId', '==', stageDoc.id)
            .where('outcome', '==', 'PENDING')
            .where('tier', '==', 'RESERVE')
            .orderBy('rank', 'asc')
            .limit(needed)
            .get();

          const totalAvailable = count + reserveSnapshot.size;

          if (totalAvailable >= TARGET) {
            const batch = this.firebase.db.batch();
            for (const opt of optionsSnapshot.docs) {
              batch.update(opt.ref, { outcome: 'ELECTED' });
            }
            for (const opt of reserveSnapshot.docs) {
              batch.update(opt.ref, { tier: 'SHORTLIST', outcome: 'ELECTED' });
            }
            batch.update(stageDoc.ref, { status: 'CLOSED' });
            batch.update(
              this.firebase.db.collection('electionProcesses').doc(stage.processId),
              { status: 'COMPLETED' },
            );
            await batch.commit();
          } else {
            const batch = this.firebase.db.batch();
            for (const opt of [...optionsSnapshot.docs, ...reserveSnapshot.docs]) {
              batch.update(opt.ref, { outcome: 'CANCELLED' });
            }
            batch.update(stageDoc.ref, { status: 'CLOSED' });
            batch.update(
              this.firebase.db.collection('electionProcesses').doc(stage.processId),
              { status: 'CANCELLED' },
            );
            await batch.commit();
          }
        }
      } catch (err: unknown) {
        this.logger.error(`Failed to process withdrawal stage ${stageDoc.id}`, err);
      }
    }

    if (stagesSnapshot.size > 0) {
      this.logger.log(`Processed ${stagesSnapshot.size} withdrawal stage(s)`);
    }
  }
}
