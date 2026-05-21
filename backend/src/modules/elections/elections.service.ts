import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { FirebaseService } from '../../common/firebase/firebase.service';
import { serializeDoc } from '../../common/utils/firestore';
import { CreateElectionDto } from './dto/create-election.dto';
import { UpdateElectionDto } from './dto/update-election.dto';
import { AdvanceElectionDto } from './dto/advance-election.dto';
import { SubmitNominationDto } from './dto/submit-nomination.dto';
import { CastVoteDto } from './dto/cast-vote.dto';

const COL = 'elections';

type Nominee = {
  userId: string;
  addedInRound: number;
  status: 'pending' | 'confirmed' | 'dismissed';
  dismissedAt: Timestamp | null;
  dismissedInRound: number | null;
};

type BoardConfig = {
  seatsCount: number;
  targetNominees: number;
  shortlistCount: number;
  dismissalWindowHours: number;
};

type ElectionData = {
  type: 'yes_no' | 'multiple_choice' | 'board';
  status: string;
  boardConfig: BoardConfig | null;
  nominees: Nominee[] | null;
  currentRound: number | null;
};

@Injectable()
export class ElectionsService {
  private readonly logger = new Logger(ElectionsService.name);

  constructor(private readonly firebase: FirebaseService) {}

  // ─── Public reads ──────────────────────────────────────────────────────────

  async findAll() {
    const snap = await this.firebase.db.collection(COL).orderBy('createdAt', 'desc').get();
    return snap.docs.map((d) => ({ id: d.id, ...serializeDoc(d.data()) }));
  }

  async findOne(id: string) {
    const doc = await this.firebase.db.collection(COL).doc(id).get();
    if (!doc.exists) throw new NotFoundException(`Election ${id} not found`);
    return { id: doc.id, ...serializeDoc(doc.data()) };
  }

  async getResults(id: string) {
    const doc = await this.firebase.db.collection(COL).doc(id).get();
    if (!doc.exists) throw new NotFoundException(`Election ${id} not found`);

    const data = doc.data() as ElectionData;

    if (data.type === 'board') {
      return { id, type: 'board', results: (doc.data() as Record<string, unknown>).results ?? null };
    }

    // Tally votes for yes_no and multiple_choice
    const votesSnap = await this.firebase.db
      .collection('votes')
      .where('electionId', '==', id)
      .get();

    const tally: Record<string, number> = {};
    for (const voteDoc of votesSnap.docs) {
      const choices = (voteDoc.data() as { choices: string[] }).choices;
      for (const choice of choices) {
        tally[choice] = (tally[choice] ?? 0) + 1;
      }
    }

    const rankings = Object.entries(tally)
      .map(([optionId, voteCount]) => ({ optionId, voteCount }))
      .sort((a, b) => b.voteCount - a.voteCount);

    return { id, type: data.type, rankings, totalVoters: votesSnap.size };
  }

  // ─── Admin operations ──────────────────────────────────────────────────────

  async create(dto: CreateElectionDto, createdBy: string): Promise<{ id: string }> {
    if (dto.type !== 'board' && (!dto.options || dto.options.length === 0)) {
      throw new BadRequestException('options are required for yes_no and multiple_choice elections');
    }
    if (dto.type === 'board' && !dto.boardConfig) {
      throw new BadRequestException('boardConfig is required for board elections');
    }

    const boardConfig = dto.type === 'board' && dto.boardConfig
      ? {
          seatsCount: dto.boardConfig.seatsCount,
          targetNominees: dto.boardConfig.targetNominees ?? dto.boardConfig.seatsCount * 2,
          shortlistCount: dto.boardConfig.shortlistCount ?? 2,
          dismissalWindowHours: dto.boardConfig.dismissalWindowHours ?? 24,
        }
      : null;

    const ref = await this.firebase.db.collection(COL).add({
      title: dto.title,
      description: dto.description ?? null,
      type: dto.type,
      status: 'draft',
      options: dto.type !== 'board' ? (dto.options ?? []).map((o) => ({ id: o.id, label: o.label })) : [],
      startTime: dto.startTime ? Timestamp.fromDate(new Date(dto.startTime)) : null,
      endTime: dto.endTime ? Timestamp.fromDate(new Date(dto.endTime)) : null,
      boardConfig,
      nominees: dto.type === 'board' ? [] : null,
      rounds: dto.type === 'board' ? [] : null,
      currentRound: null,
      votingStart: null,
      votingEnd: null,
      results: null,
      createdBy,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { id: ref.id };
  }

  async update(id: string, dto: UpdateElectionDto): Promise<void> {
    const doc = await this.firebase.db.collection(COL).doc(id).get();
    if (!doc.exists) throw new NotFoundException(`Election ${id} not found`);
    if (doc.data()?.status !== 'draft') {
      throw new BadRequestException('Only draft elections can be edited directly — use /advance to change status');
    }

    const payload = Object.fromEntries(Object.entries(dto).filter(([, v]) => v !== undefined));
    await this.firebase.db.collection(COL).doc(id).update({
      ...payload,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  async remove(id: string): Promise<void> {
    const doc = await this.firebase.db.collection(COL).doc(id).get();
    if (!doc.exists) throw new NotFoundException(`Election ${id} not found`);
    if (doc.data()?.status !== 'draft') {
      throw new BadRequestException('Only draft elections can be deleted');
    }
    await this.firebase.db.collection(COL).doc(id).delete();
  }

  async advance(id: string, dto: AdvanceElectionDto, userId: string): Promise<void> {
    const doc = await this.firebase.db.collection(COL).doc(id).get();
    if (!doc.exists) throw new NotFoundException(`Election ${id} not found`);

    const data = doc.data() as ElectionData & Record<string, unknown>;
    const from = data.status;
    const to = dto.status;

    this.assertValidTransition(from, to, data.type);

    const update: Record<string, unknown> = {
      status: to,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (to === 'nomination') {
      if (!dto.nominationStart || !dto.nominationEnd || !dto.dismissalStart || !dto.dismissalEnd) {
        throw new BadRequestException('nominationStart, nominationEnd, dismissalStart, dismissalEnd are required');
      }
      const roundNumber = (data.currentRound ?? 0) + 1;
      const newRound = {
        roundNumber,
        nominationStart: Timestamp.fromDate(new Date(dto.nominationStart)),
        nominationEnd: Timestamp.fromDate(new Date(dto.nominationEnd)),
        dismissalStart: Timestamp.fromDate(new Date(dto.dismissalStart)),
        dismissalEnd: Timestamp.fromDate(new Date(dto.dismissalEnd)),
        status: 'nomination',
      };
      const existingRounds = (data.rounds as unknown[]) ?? [];
      update.rounds = [...existingRounds, newRound];
      update.currentRound = roundNumber;
    }

    if (to === 'dismissal') {
      // Mark current round as in dismissal
      const rounds = (data.rounds as Record<string, unknown>[]) ?? [];
      const currentRound = data.currentRound ?? 1;
      update.rounds = rounds.map((r) =>
        (r as { roundNumber: number }).roundNumber === currentRound
          ? { ...r, status: 'dismissal' }
          : r,
      );
    }

    if (to === 'voting') {
      if (data.type === 'board') {
        if (!dto.votingStart || !dto.votingEnd) {
          throw new BadRequestException('votingStart and votingEnd are required for board elections');
        }
        update.votingStart = Timestamp.fromDate(new Date(dto.votingStart));
        update.votingEnd = Timestamp.fromDate(new Date(dto.votingEnd));
        // Mark current round as completed
        const rounds = (data.rounds as Record<string, unknown>[]) ?? [];
        update.rounds = rounds.map((r) =>
          (r as { roundNumber: number }).roundNumber === data.currentRound
            ? { ...r, status: 'completed' }
            : r,
        );
      }
    }

    if (to === 'cancelled') {
      update.cancellationReason = dto.reason ?? null;
    }

    await this.firebase.db.collection(COL).doc(id).update(update);
  }

  async finalizeResults(id: string, finalizedBy: string): Promise<void> {
    const doc = await this.firebase.db.collection(COL).doc(id).get();
    if (!doc.exists) throw new NotFoundException(`Election ${id} not found`);

    const data = doc.data() as ElectionData & Record<string, unknown>;
    if (data.type !== 'board') throw new BadRequestException('Only board elections need manual finalization');
    if (data.status !== 'voting') throw new BadRequestException('Election must be in voting status to finalize');

    const votesSnap = await this.firebase.db
      .collection('votes')
      .where('electionId', '==', id)
      .get();

    const tally: Record<string, number> = {};
    for (const voteDoc of votesSnap.docs) {
      const choices = (voteDoc.data() as { choices: string[] }).choices;
      for (const userId of choices) {
        tally[userId] = (tally[userId] ?? 0) + 1;
      }
    }

    const cfg = data.boardConfig!;
    const rankings = Object.entries(tally)
      .map(([candidateUserId, voteCount]) => ({ candidateUserId, voteCount }))
      .sort((a, b) => b.voteCount - a.voteCount);

    const winners = rankings.slice(0, cfg.seatsCount).map((r) => r.candidateUserId);
    const shortlist = rankings.slice(cfg.seatsCount, cfg.seatsCount + cfg.shortlistCount).map((r) => r.candidateUserId);

    await this.firebase.db.collection(COL).doc(id).update({
      status: 'completed',
      results: {
        rankings,
        winners,
        shortlist,
        finalizedAt: Timestamp.now(),
        finalizedBy,
      },
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  async getMyVote(id: string, userId: string) {
    const voteRef = this.firebase.db.collection('votes').doc(`${id}_${userId}`);
    const doc = await voteRef.get();
    if (!doc.exists) return { voted: false, choices: null };
    const data = doc.data() as { choices: string[]; castAt: unknown };
    return { voted: true, choices: data.choices, castAt: data.castAt };
  }

  async getTopNominees(id: string) {
    const electionDoc = await this.firebase.db.collection(COL).doc(id).get();
    if (!electionDoc.exists) throw new NotFoundException(`Election ${id} not found`);

    const data = electionDoc.data() as ElectionData;
    if (data.type !== 'board') return { nominees: [] };

    // Tally how many nominators included each nominee
    const nominationsSnap = await this.firebase.db
      .collection(COL).doc(id)
      .collection('nominations')
      .get();

    const tally: Record<string, number> = {};
    for (const nomDoc of nominationsSnap.docs) {
      const nominees = (nomDoc.data() as { nominees: string[] }).nominees ?? [];
      for (const uid of nominees) {
        tally[uid] = (tally[uid] ?? 0) + 1;
      }
    }

    const nominees = Object.entries(tally)
      .map(([userId, nominationCount]) => ({ userId, nominationCount }))
      .sort((a, b) => b.nominationCount - a.nominationCount);

    return { nominees };
  }

  // ─── Member operations ─────────────────────────────────────────────────────

  async submitNomination(id: string, dto: SubmitNominationDto, userId: string): Promise<void> {
    const doc = await this.firebase.db.collection(COL).doc(id).get();
    if (!doc.exists) throw new NotFoundException(`Election ${id} not found`);

    const data = doc.data() as ElectionData;
    if (data.type !== 'board') throw new BadRequestException('Nominations are only for board elections');
    if (data.status !== 'nomination') throw new BadRequestException('Election is not in the nomination phase');

    const currentRound = data.currentRound!;
    const cfg = data.boardConfig!;

    if (dto.nominees.length !== cfg.seatsCount) {
      throw new BadRequestException(`You must nominate exactly ${cfg.seatsCount} people`);
    }

    // Validate all nominees exist in one batch read
    const nomineeRefs = dto.nominees.map((uid) =>
      this.firebase.db.collection('users').doc(uid),
    );
    if (nomineeRefs.length > 0) {
      const nomineeDocs = await this.firebase.db.getAll(...nomineeRefs);
      for (const nomineeDoc of nomineeDocs) {
        if (!nomineeDoc.exists) {
          throw new BadRequestException(`User ${nomineeDoc.id} not found`);
        }
      }
    }

    const nomRef = this.firebase.db.collection(COL).doc(id).collection('nominations').doc(userId);

    await this.firebase.db.runTransaction(async (tx) => {
      const existingNomDoc = await tx.get(nomRef);
      if (existingNomDoc.exists && (existingNomDoc.data() as { round: number }).round === currentRound) {
        throw new BadRequestException('You have already submitted nominations for this round');
      }

      // Write to subcollection
      tx.set(nomRef, {
        nominatorUserId: userId,
        nominees: dto.nominees,
        round: currentRound,
        submittedAt: Timestamp.now(),
      });

      // Add new nominees to the pool (skip already-present ones)
      const existingIds = new Set((data.nominees ?? []).map((n) => n.userId));
      const newNominees = dto.nominees
        .filter((uid) => !existingIds.has(uid))
        .map((uid): Nominee => ({
          userId: uid,
          addedInRound: currentRound,
          status: 'pending',
          dismissedAt: null,
          dismissedInRound: null,
        }));

      if (newNominees.length > 0) {
        tx.update(this.firebase.db.collection(COL).doc(id), {
          nominees: FieldValue.arrayUnion(...newNominees),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    });
  }

  async dismissSelf(id: string, userId: string): Promise<void> {
    const doc = await this.firebase.db.collection(COL).doc(id).get();
    if (!doc.exists) throw new NotFoundException(`Election ${id} not found`);

    const data = doc.data() as ElectionData;
    if (data.status !== 'dismissal') throw new BadRequestException('Election is not in the dismissal phase');

    const nominees = data.nominees ?? [];
    const idx = nominees.findIndex((n) => n.userId === userId && n.status === 'pending');
    if (idx === -1) throw new ForbiddenException('You are not a pending nominee in this election');

    const updated = [...nominees];
    updated[idx] = {
      ...updated[idx],
      status: 'dismissed',
      dismissedAt: Timestamp.now(),
      dismissedInRound: data.currentRound,
    };

    await this.firebase.db.collection(COL).doc(id).update({
      nominees: updated,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  async castVote(id: string, dto: CastVoteDto, userId: string): Promise<void> {
    const electionRef = this.firebase.db.collection(COL).doc(id);
    const voteRef = this.firebase.db.collection('votes').doc(`${id}_${userId}`);

    await this.firebase.db.runTransaction(async (tx) => {
      const [electionSnap, existing] = await Promise.all([tx.get(electionRef), tx.get(voteRef)]);

      if (!electionSnap.exists) throw new NotFoundException(`Election ${id} not found`);
      if (existing.exists) throw new ForbiddenException('You have already voted in this election');

      const data = electionSnap.data() as ElectionData;
      if (data.status !== 'voting') throw new BadRequestException('Election is not in the voting phase');

      if (data.type === 'yes_no' && dto.choices.length !== 1) {
        throw new BadRequestException('Yes/No elections require exactly 1 choice');
      }
      if (data.type === 'board') {
        if (dto.choices.length !== data.boardConfig!.seatsCount) {
          throw new BadRequestException(`Board elections require exactly ${data.boardConfig!.seatsCount} choices`);
        }
      }

      tx.set(voteRef, {
        electionId: id,
        userId,
        electionType: data.type,
        choices: dto.choices,
        castAt: FieldValue.serverTimestamp(),
      });
    });
  }

  // ─── Scheduler helpers ─────────────────────────────────────────────────────

  async autoConfirmExpiredDismissals(): Promise<void> {
    const now = Timestamp.now();

    const snap = await this.firebase.db
      .collection(COL)
      .where('status', '==', 'dismissal')
      .get();

    for (const electionDoc of snap.docs) {
      try {
        const data = electionDoc.data() as ElectionData & {
          rounds: { roundNumber: number; dismissalEnd: Timestamp; status: string }[];
        };

        const currentRound = data.rounds?.find((r) => r.roundNumber === data.currentRound);
        if (!currentRound || currentRound.dismissalEnd.toMillis() > now.toMillis()) continue;

        const nominees = data.nominees ?? [];
        const updated = nominees.map((n) =>
          n.status === 'pending'
            ? { ...n, status: 'confirmed' as const }
            : n,
        );

        const confirmed = updated.filter((n) => n.status === 'confirmed').length;
        const cfg = data.boardConfig!;
        const hasEnough = confirmed >= cfg.targetNominees;

        await this.firebase.db.collection(COL).doc(electionDoc.id).update({
          nominees: updated,
          status: hasEnough ? 'voting' : 'nomination',
          updatedAt: FieldValue.serverTimestamp(),
        });
      } catch (err: unknown) {
        this.logger.error(`autoConfirmExpiredDismissals failed for election ${electionDoc.id}`, err);
      }
    }
  }

  async autoCloseExpiredVoting(): Promise<void> {
    const now = Timestamp.now();

    const snap = await this.firebase.db
      .collection(COL)
      .where('status', '==', 'voting')
      .get();

    for (const electionDoc of snap.docs) {
      try {
        const data = electionDoc.data() as ElectionData & {
          endTime: Timestamp | null;
          votingEnd: Timestamp | null;
        };

        const deadline = data.type === 'board' ? data.votingEnd : data.endTime;
        if (!deadline || deadline.toMillis() > now.toMillis()) continue;

        if (data.type === 'board') {
          this.logger.warn(
            `Board election ${electionDoc.id} votingEnd has passed — admin must call POST /elections/${electionDoc.id}/finalize`,
          );
          continue;
        }

        // yes_no / multiple_choice: auto-complete
        await this.firebase.db.collection(COL).doc(electionDoc.id).update({
          status: 'completed',
          updatedAt: FieldValue.serverTimestamp(),
        });
      } catch (err: unknown) {
        this.logger.error(`autoCloseExpiredVoting failed for election ${electionDoc.id}`, err);
      }
    }
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private assertValidTransition(from: string, to: string, type: string): void {
    const valid: Record<string, string[]> = {
      draft: ['nomination', 'voting', 'cancelled'],
      nomination: ['dismissal', 'cancelled'],
      dismissal: ['nomination', 'voting', 'cancelled'],
      voting: ['completed', 'cancelled'],
      completed: [],
      cancelled: [],
    };

    if (to === 'nomination' && type !== 'board') {
      throw new BadRequestException('Only board elections have nomination phases — advance directly to voting');
    }

    if (!valid[from]?.includes(to)) {
      throw new BadRequestException(`Cannot transition from '${from}' to '${to}'`);
    }
  }
}
