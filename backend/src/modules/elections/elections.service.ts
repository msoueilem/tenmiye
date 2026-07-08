import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { Election, ElectionDocument } from './schemas/election.schema';
import { Vote, VoteDocument } from './schemas/vote.schema';
import { Nomination, NominationDocument } from './schemas/nomination.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { serialize } from '../../common/database/serialize';
import { CreateElectionDto } from './dto/create-election.dto';
import { UpdateElectionDto } from './dto/update-election.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { AdvanceElectionDto } from './dto/advance-election.dto';
import { SubmitNominationDto } from './dto/submit-nomination.dto';
import { CastVoteDto } from './dto/cast-vote.dto';

type Nominee = {
  userId: string;
  addedInRound: number;
  status: 'pending' | 'confirmed' | 'dismissed';
  dismissedAt: Date | null;
  dismissedInRound: number | null;
};

type BoardConfig = {
  seatsCount: number;
  targetNominees: number;
  shortlistCount: number;
  dismissalWindowHours: number;
};

type ElectionData = {
  _id: Types.ObjectId;
  type: 'yes_no' | 'multiple_choice' | 'board';
  status: string;
  boardConfig: BoardConfig | null;
  nominees: Nominee[] | null;
  currentRound: number | null;
  rounds?: Record<string, unknown>[] | null;
  options?: { id: string; label: string }[];
  results?: Record<string, unknown> | null;
} & Record<string, unknown>;

const asDate = (v?: string | Date | null): Date | null =>
  v == null ? null : v instanceof Date ? v : new Date(v);

@Injectable()
export class ElectionsService {
  private readonly logger = new Logger(ElectionsService.name);

  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(Election.name) private readonly elections: Model<ElectionDocument>,
    @InjectModel(Vote.name) private readonly votes: Model<VoteDocument>,
    @InjectModel(Nomination.name) private readonly nominations: Model<NominationDocument>,
    @InjectModel(User.name) private readonly users: Model<UserDocument>,
  ) {}

  // ─── Public reads ──────────────────────────────────────────────────────────

  async findAll() {
    const docs = await this.elections.find().sort({ createdAt: -1 }).lean();
    return docs.map(serialize);
  }

  async findOne(id: string) {
    const doc = await this.byId(id);
    return serialize(doc);
  }

  async getResults(id: string) {
    const data = (await this.byId(id)) as ElectionData;

    if (data.type === 'board') {
      const stored = (data.results ?? null) as {
        rankings?: { candidateUserId: string; voteCount: number }[];
        winners?: string[];
        shortlist?: string[];
      } | null;
      if (!stored) return { id, type: 'board', results: null };

      const rankings = stored.rankings ?? [];
      const winners = stored.winners ?? [];
      const shortlist = stored.shortlist ?? [];
      const names = await this.resolveUserNames([
        ...rankings.map((r) => r.candidateUserId),
        ...winners,
        ...shortlist,
      ]);

      return {
        id,
        type: 'board',
        results: {
          rankings: rankings.map((r) => ({ ...r, name: names[r.candidateUserId] ?? null })),
          winners: winners.map((uid) => ({ candidateUserId: uid, name: names[uid] ?? null })),
          shortlist: shortlist.map((uid) => ({ candidateUserId: uid, name: names[uid] ?? null })),
        },
      };
    }

    const votes = await this.votes.find({ electionId: id }).lean();
    const tally: Record<string, number> = {};
    for (const v of votes) for (const choice of v.choices ?? []) tally[choice] = (tally[choice] ?? 0) + 1;

    const optionLabels: Record<string, string> = {};
    for (const opt of data.options ?? []) optionLabels[opt.id] = opt.label;

    const rankings = Object.entries(tally)
      .map(([optionId, voteCount]) => ({ optionId, voteCount, label: optionLabels[optionId] ?? null }))
      .sort((a, b) => b.voteCount - a.voteCount);

    return { id, type: data.type, rankings, totalVoters: votes.length };
  }

  /** Batch-resolve user ids to a display name (Arabic preferred). */
  private async resolveUserNames(ids: string[]): Promise<Record<string, string>> {
    const unique = [...new Set(ids)].filter((x) => x && Types.ObjectId.isValid(x));
    if (unique.length === 0) return {};
    const docs = await this.users
      .find({ _id: { $in: unique } })
      .select('fullName fullNameAr fullNameFr')
      .lean();
    const names: Record<string, string> = {};
    for (const u of docs) {
      const uu = u as { fullName?: string; fullNameAr?: string | null; fullNameFr?: string | null };
      names[String(u._id)] = uu.fullNameAr || uu.fullName || uu.fullNameFr || String(u._id);
    }
    return names;
  }

  // ─── Admin operations ──────────────────────────────────────────────────────

  async create(dto: CreateElectionDto, createdBy: string): Promise<{ id: string }> {
    if (dto.type !== 'board' && (!dto.options || dto.options.length === 0)) {
      throw new BadRequestException('options are required for yes_no and multiple_choice elections');
    }
    if (dto.type === 'board' && !dto.boardConfig) {
      throw new BadRequestException('boardConfig is required for board elections');
    }

    const boardConfig =
      dto.type === 'board' && dto.boardConfig
        ? {
            seatsCount: dto.boardConfig.seatsCount,
            targetNominees: dto.boardConfig.targetNominees ?? dto.boardConfig.seatsCount * 2,
            shortlistCount: dto.boardConfig.shortlistCount ?? 2,
            dismissalWindowHours: dto.boardConfig.dismissalWindowHours ?? 24,
          }
        : null;

    const doc = await this.elections.create({
      title: dto.title,
      description: dto.description ?? null,
      type: dto.type,
      status: 'draft',
      options: dto.type !== 'board' ? (dto.options ?? []).map((o) => ({ id: o.id, label: o.label })) : [],
      startTime: asDate(dto.startTime),
      endTime: asDate(dto.endTime),
      nominationStart: asDate(dto.nominationStart),
      nominationEnd: asDate(dto.nominationEnd),
      dismissalStart: asDate(dto.dismissalStart),
      dismissalEnd: asDate(dto.dismissalEnd),
      votingStart: asDate(dto.votingStart),
      votingEnd: asDate(dto.votingEnd),
      boardConfig,
      nominees: dto.type === 'board' ? [] : null,
      rounds: dto.type === 'board' ? [] : null,
      currentRound: null,
      results: null,
      createdBy,
    });
    return { id: doc.id };
  }

  async update(id: string, dto: UpdateElectionDto): Promise<void> {
    const data = await this.byId(id);
    if (data.status !== 'draft') {
      throw new BadRequestException('Only draft elections can be edited directly — use /advance to change status');
    }
    const payload = Object.fromEntries(Object.entries(dto).filter(([, v]) => v !== undefined));
    await this.elections.updateOne({ _id: id }, { $set: payload });
  }

  async updateSchedule(id: string, dto: UpdateScheduleDto): Promise<void> {
    const data = (await this.byId(id)) as ElectionData;
    const payload: Record<string, unknown> = {};

    const dateKeys: (keyof UpdateScheduleDto)[] = [
      'nominationStart', 'nominationEnd', 'dismissalStart', 'dismissalEnd',
      'votingStart', 'votingEnd', 'startTime', 'endTime',
    ];
    for (const k of dateKeys) {
      if (dto[k] !== undefined) payload[k] = asDate(dto[k]);
    }

    if (data.type === 'board' && data.currentRound != null) {
      const rounds = ((data.rounds as Record<string, unknown>[]) ?? []).map((r) => {
        if ((r as { roundNumber: number }).roundNumber !== data.currentRound) return r;
        const updated = { ...r };
        if (dto.nominationStart) updated.nominationStart = asDate(dto.nominationStart);
        if (dto.nominationEnd) updated.nominationEnd = asDate(dto.nominationEnd);
        if (dto.dismissalStart) updated.dismissalStart = asDate(dto.dismissalStart);
        if (dto.dismissalEnd) updated.dismissalEnd = asDate(dto.dismissalEnd);
        return updated;
      });
      payload.rounds = rounds;
    }

    await this.elections.updateOne({ _id: id }, { $set: payload });
  }

  async remove(id: string): Promise<void> {
    const data = await this.byId(id);
    if (data.status !== 'draft') throw new BadRequestException('Only draft elections can be deleted');
    await this.elections.deleteOne({ _id: data._id });
  }

  async advance(id: string, dto: AdvanceElectionDto, _userId: string): Promise<void> {
    const data = (await this.byId(id)) as ElectionData;
    const from = data.status;
    const to = dto.status;
    this.assertValidTransition(from, to, data.type);

    const update: Record<string, unknown> = { status: to };

    if (to === 'nomination') {
      const nomStart = dto.nominationStart ?? asDate(data.nominationStart as Date)?.toISOString();
      const nomEnd = dto.nominationEnd ?? asDate(data.nominationEnd as Date)?.toISOString();
      const disStart = dto.dismissalStart ?? asDate(data.dismissalStart as Date)?.toISOString();
      const disEnd = dto.dismissalEnd ?? asDate(data.dismissalEnd as Date)?.toISOString();
      if (!nomStart || !nomEnd || !disStart || !disEnd) {
        throw new BadRequestException('nominationStart, nominationEnd, dismissalStart, dismissalEnd are required');
      }
      const roundNumber = (data.currentRound ?? 0) + 1;
      const newRound = {
        roundNumber,
        nominationStart: new Date(nomStart),
        nominationEnd: new Date(nomEnd),
        dismissalStart: new Date(disStart),
        dismissalEnd: new Date(disEnd),
        status: 'nomination',
      };
      update.rounds = [...((data.rounds as unknown[]) ?? []), newRound];
      update.currentRound = roundNumber;
    }

    if (to === 'dismissal') {
      const rounds = (data.rounds as Record<string, unknown>[]) ?? [];
      const currentRound = data.currentRound ?? 1;
      update.rounds = rounds.map((r) =>
        (r as { roundNumber: number }).roundNumber === currentRound ? { ...r, status: 'dismissal' } : r,
      );
    }

    if (to === 'voting' && data.type === 'board') {
      const votStart = dto.votingStart ?? asDate(data.votingStart as Date)?.toISOString();
      const votEnd = dto.votingEnd ?? asDate(data.votingEnd as Date)?.toISOString();
      if (!votStart || !votEnd) {
        throw new BadRequestException('votingStart and votingEnd are required for board elections');
      }
      update.votingStart = new Date(votStart);
      update.votingEnd = new Date(votEnd);
      const rounds = (data.rounds as Record<string, unknown>[]) ?? [];
      update.rounds = rounds.map((r) =>
        (r as { roundNumber: number }).roundNumber === data.currentRound ? { ...r, status: 'completed' } : r,
      );
    }

    if (to === 'cancelled') update.cancellationReason = dto.reason ?? null;

    await this.elections.updateOne({ _id: id }, { $set: update });
  }

  async finalizeResults(id: string, finalizedBy: string): Promise<void> {
    const data = (await this.byId(id)) as ElectionData;
    if (data.type !== 'board') throw new BadRequestException('Only board elections need manual finalization');
    if (data.status !== 'voting') throw new BadRequestException('Election must be in voting status to finalize');

    const votes = await this.votes.find({ electionId: id }).lean();
    const tally: Record<string, number> = {};
    for (const v of votes) for (const uid of v.choices ?? []) tally[uid] = (tally[uid] ?? 0) + 1;

    const cfg = data.boardConfig!;
    const rankings = Object.entries(tally)
      .map(([candidateUserId, voteCount]) => ({ candidateUserId, voteCount }))
      .sort((a, b) => b.voteCount - a.voteCount);
    const winners = rankings.slice(0, cfg.seatsCount).map((r) => r.candidateUserId);
    const shortlist = rankings.slice(cfg.seatsCount, cfg.seatsCount + cfg.shortlistCount).map((r) => r.candidateUserId);

    await this.elections.updateOne(
      { _id: id },
      { $set: { status: 'completed', results: { rankings, winners, shortlist, finalizedAt: new Date(), finalizedBy } } },
    );
  }

  async getMyVote(id: string, userId: string) {
    const doc = await this.votes.findById(`${id}_${userId}`).lean();
    if (!doc) return { voted: false, choices: null };
    return { voted: true, choices: doc.choices, castAt: doc.castAt };
  }

  async getTopNominees(id: string) {
    const data = (await this.byId(id)) as ElectionData;
    if (data.type !== 'board') return { nominees: [] };

    const noms = await this.nominations.find({ electionId: id }).lean();
    const tally: Record<string, number> = {};
    for (const n of noms) for (const uid of n.nominees ?? []) tally[uid] = (tally[uid] ?? 0) + 1;

    const sorted = Object.entries(tally)
      .map(([userId, nominationCount]) => ({ userId, nominationCount }))
      .sort((a, b) => b.nominationCount - a.nominationCount);
    const names = await this.resolveUserNames(sorted.map((n) => n.userId));
    return { nominees: sorted.map((n) => ({ ...n, name: names[n.userId] ?? null })) };
  }

  // ─── Member operations ─────────────────────────────────────────────────────

  async getMyNomination(id: string, userId: string): Promise<{ submitted: boolean; nominees: string[] }> {
    const data = (await this.byId(id)) as ElectionData;
    const currentRound = data.currentRound ?? 1;
    const nom = await this.nominations.findById(`${id}_${userId}`).lean();
    if (!nom || nom.round !== currentRound) return { submitted: false, nominees: [] };
    return { submitted: true, nominees: nom.nominees };
  }

  async submitNomination(id: string, dto: SubmitNominationDto, userId: string): Promise<void> {
    const data = (await this.byId(id)) as ElectionData;
    if (data.type !== 'board') throw new BadRequestException('Nominations are only for board elections');
    if (data.status !== 'nomination') throw new BadRequestException('Election is not in the nomination phase');

    const currentRound = data.currentRound!;
    const cfg = data.boardConfig!;
    if (dto.nominees.length !== cfg.seatsCount) {
      throw new BadRequestException(`You must nominate exactly ${cfg.seatsCount} people`);
    }

    const validIds = dto.nominees.filter((u) => Types.ObjectId.isValid(u));
    const found = await this.users.countDocuments({ _id: { $in: validIds } });
    if (found !== dto.nominees.length) throw new BadRequestException('One or more nominees not found');

    const nomId = `${id}_${userId}`;
    const session = await this.connection.startSession();
    try {
      await session.withTransaction(async () => {
        const existing = await this.nominations.findById(nomId).session(session).lean();
        if (existing && existing.round === currentRound) {
          throw new BadRequestException('You have already submitted nominations for this round');
        }

        await this.nominations.updateOne(
          { _id: nomId },
          { $set: { electionId: id, nominatorUserId: userId, nominees: dto.nominees, round: currentRound, submittedAt: new Date() } },
          { upsert: true, session },
        );

        const election = await this.elections.findById(id).select('nominees').session(session).lean();
        const existingIds = new Set(((election?.nominees as Nominee[]) ?? []).map((n) => n.userId));
        const newNominees: Nominee[] = dto.nominees
          .filter((uid) => !existingIds.has(uid))
          .map((uid) => ({ userId: uid, addedInRound: currentRound, status: 'pending', dismissedAt: null, dismissedInRound: null }));

        if (newNominees.length > 0) {
          await this.elections.updateOne({ _id: id }, { $push: { nominees: { $each: newNominees } } }, { session });
        }
      });
    } finally {
      await session.endSession();
    }
  }

  async dismissSelf(id: string, userId: string): Promise<void> {
    const data = (await this.byId(id)) as ElectionData;
    if (data.status !== 'dismissal') throw new BadRequestException('Election is not in the dismissal phase');

    const nominees = (data.nominees ?? []) as Nominee[];
    const idx = nominees.findIndex((n) => n.userId === userId && n.status === 'pending');
    if (idx === -1) throw new ForbiddenException('You are not a pending nominee in this election');

    const updated = [...nominees];
    updated[idx] = { ...updated[idx], status: 'dismissed', dismissedAt: new Date(), dismissedInRound: data.currentRound };
    await this.elections.updateOne({ _id: id }, { $set: { nominees: updated } });
  }

  async castVote(id: string, dto: CastVoteDto, userId: string): Promise<void> {
    const voteId = `${id}_${userId}`;
    const session = await this.connection.startSession();
    try {
      await session.withTransaction(async () => {
        const election = (await this.elections.findById(id).session(session).lean()) as ElectionData | null;
        if (!election) throw new NotFoundException(`Election ${id} not found`);

        const existing = await this.votes.findById(voteId).session(session).lean();
        if (existing) throw new ForbiddenException('You have already voted in this election');

        if (election.status !== 'voting') throw new BadRequestException('Election is not in the voting phase');
        if (election.type === 'yes_no' && dto.choices.length !== 1) {
          throw new BadRequestException('Yes/No elections require exactly 1 choice');
        }
        if (election.type === 'board' && dto.choices.length !== election.boardConfig!.seatsCount) {
          throw new BadRequestException(`Board elections require exactly ${election.boardConfig!.seatsCount} choices`);
        }

        await this.votes.create(
          [{ _id: voteId, electionId: id, userId, electionType: election.type, choices: dto.choices, castAt: new Date() }],
          { session },
        );
      });
    } finally {
      await session.endSession();
    }
  }

  // ─── Scheduler helpers ─────────────────────────────────────────────────────

  async autoConfirmExpiredDismissals(): Promise<void> {
    const now = Date.now();
    const docs = (await this.elections.find({ status: 'dismissal' }).lean()) as unknown as ElectionData[];
    for (const data of docs) {
      try {
        const rounds = (data.rounds as { roundNumber: number; dismissalEnd: Date; status: string }[]) ?? [];
        const currentRound = rounds.find((r) => r.roundNumber === data.currentRound);
        if (!currentRound || new Date(currentRound.dismissalEnd).getTime() > now) continue;

        const nominees = ((data.nominees ?? []) as Nominee[]).map((n) =>
          n.status === 'pending' ? { ...n, status: 'confirmed' as const } : n,
        );
        const confirmed = nominees.filter((n) => n.status === 'confirmed').length;
        const hasEnough = confirmed >= data.boardConfig!.targetNominees;

        await this.elections.updateOne(
          { _id: data._id },
          { $set: { nominees, status: hasEnough ? 'voting' : 'nomination' } },
        );
      } catch (err: unknown) {
        this.logger.error(`autoConfirmExpiredDismissals failed for election ${String(data._id)}`, err);
      }
    }
  }

  async autoCloseExpiredVoting(): Promise<void> {
    const now = Date.now();
    const docs = (await this.elections.find({ status: 'voting' }).lean()) as unknown as ElectionData[];
    for (const data of docs) {
      try {
        const deadline = (data.type === 'board' ? data.votingEnd : data.endTime) as Date | null;
        if (!deadline || new Date(deadline).getTime() > now) continue;

        if (data.type === 'board') {
          this.logger.warn(
            `Board election ${String(data._id)} votingEnd has passed — admin must call POST /elections/${String(data._id)}/finalize`,
          );
          continue;
        }
        await this.elections.updateOne({ _id: data._id }, { $set: { status: 'completed' } });
      } catch (err: unknown) {
        this.logger.error(`autoCloseExpiredVoting failed for election ${String(data._id)}`, err);
      }
    }
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private async byId(id: string): Promise<ElectionData> {
    const doc = Types.ObjectId.isValid(id) ? await this.elections.findById(id).lean() : null;
    if (!doc) throw new NotFoundException(`Election ${id} not found`);
    return doc as unknown as ElectionData;
  }

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
