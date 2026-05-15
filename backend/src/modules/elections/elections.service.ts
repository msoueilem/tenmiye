import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../../common/firebase/firebase.service';
import { CreateElectionDto } from './dto/create-election.dto';
import { UpdateElectionDto } from './dto/update-election.dto';
import { SubmitNominationDto } from './dto/submit-nomination.dto';
import { CastVoteDto } from './dto/cast-vote.dto';
import { FieldValue } from 'firebase-admin/firestore';
import { serializeDoc } from '../../common/utils/firestore';
import { JwtPayload } from '../../common/strategies/jwt.strategy';

@Injectable()
export class ElectionsService {
  constructor(private readonly firebase: FirebaseService) {}

  async findAll(): Promise<{ id: string; [key: string]: unknown }[]> {
    const snapshot = await this.firebase.db.collection('electionProcesses').get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...serializeDoc(doc.data()) }));
  }

  async findOne(id: string): Promise<{ id: string; [key: string]: unknown }> {
    const doc = await this.firebase.db.collection('electionProcesses').doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException(`Election ${id} not found`);
    }
    return { id: doc.id, ...serializeDoc(doc.data()) };
  }

  async create(dto: CreateElectionDto, user: JwtPayload): Promise<{ id: string }> {
    if (new Date(dto.endTime) <= new Date(dto.startTime)) {
      throw new BadRequestException('endTime must be after startTime');
    }

    const ref = await this.firebase.db.collection('electionProcesses').add({
      title: dto.title,
      description: dto.description ?? null,
      type: dto.type,
      startTime: dto.startTime,
      endTime: dto.endTime,
      status: 'pending',
      createdBy: user.userId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { id: ref.id };
  }

  async update(id: string, dto: UpdateElectionDto): Promise<void> {
    const doc = await this.firebase.db.collection('electionProcesses').doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException(`Election ${id} not found`);
    }

    if (dto.startTime && dto.endTime && new Date(dto.endTime) <= new Date(dto.startTime)) {
      throw new BadRequestException('endTime must be after startTime');
    }

    const payload = Object.fromEntries(
      Object.entries(dto).filter(([, v]) => v !== undefined),
    );
    await this.firebase.db.collection('electionProcesses').doc(id).update({
      ...payload,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  async remove(id: string): Promise<void> {
    const doc = await this.firebase.db.collection('electionProcesses').doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException(`Election ${id} not found`);
    }
    await this.firebase.db.collection('electionProcesses').doc(id).delete();
  }

  async submitNomination(
    electionId: string,
    dto: SubmitNominationDto,
    user: JwtPayload,
  ): Promise<void> {
    const election = await this.firebase.db.collection('electionProcesses').doc(electionId).get();
    if (!election.exists) {
      throw new NotFoundException(`Election ${electionId} not found`);
    }
    if (election.data()?.status === 'completed' || election.data()?.status === 'cancelled') {
      throw new BadRequestException('This election is no longer accepting nominations');
    }

    for (const nomineeId of dto.nomineeUids) {
      const userDoc = await this.firebase.db.collection('users').doc(nomineeId).get();
      if (!userDoc.exists) {
        throw new BadRequestException(`User ${nomineeId} not found`);
      }

      const dupSnap = await this.firebase.db
        .collection('nominationBallots')
        .where('electionId', '==', electionId)
        .where('voterId', '==', user.userId)
        .where('nomineeId', '==', nomineeId)
        .limit(1)
        .get();
      if (!dupSnap.empty) {
        throw new BadRequestException(`You have already nominated user ${nomineeId} in this election`);
      }
    }

    const batch = this.firebase.db.batch();
    for (const nomineeId of dto.nomineeUids) {
      const ref = this.firebase.db.collection('nominationBallots').doc();
      batch.set(ref, {
        electionId,
        voterId: user.userId,
        nomineeId,
        createdAt: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
  }

  async getResults(electionId: string): Promise<{ electionId: string; results: { selection: string; count: number }[] }> {
    const election = await this.firebase.db.collection('electionProcesses').doc(electionId).get();
    if (!election.exists) throw new NotFoundException(`Election ${electionId} not found`);

    const snapshot = await this.firebase.db
      .collection('votes')
      .where('electionId', '==', electionId)
      .get();

    const tally: Record<string, number> = {};
    for (const doc of snapshot.docs) {
      const { selection } = doc.data() as { selection: string };
      tally[selection] = (tally[selection] ?? 0) + 1;
    }

    const results = Object.entries(tally)
      .map(([selection, count]) => ({ selection, count }))
      .sort((a, b) => b.count - a.count);

    return { electionId, results };
  }

  async castVote(
    electionId: string,
    dto: CastVoteDto,
    user: JwtPayload,
  ): Promise<void> {
    const election = await this.firebase.db.collection('electionProcesses').doc(electionId).get();
    if (!election.exists) {
      throw new NotFoundException(`Election ${electionId} not found`);
    }
    if (election.data()?.status === 'completed' || election.data()?.status === 'cancelled') {
      throw new BadRequestException('This election is no longer accepting votes');
    }

    const existingVote = await this.firebase.db
      .collection('votes')
      .where('electionId', '==', electionId)
      .where('voterId', '==', user.userId)
      .limit(1)
      .get();
    if (!existingVote.empty) {
      throw new ForbiddenException('You have already voted in this election');
    }

    const batch = this.firebase.db.batch();
    for (const selection of dto.selections) {
      const ref = this.firebase.db.collection('votes').doc();
      batch.set(ref, {
        electionId,
        voterId: user.userId,
        selection,
        createdAt: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
  }
}
