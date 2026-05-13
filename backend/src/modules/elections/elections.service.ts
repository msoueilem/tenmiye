import { Injectable, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../../common/firebase/firebase.service';
import { CreateElectionDto } from './dto/create-election.dto';
import { SubmitNominationDto } from './dto/submit-nomination.dto';
import { CastVoteDto } from './dto/cast-vote.dto';
import { FieldValue } from 'firebase-admin/firestore';
import { JwtPayload } from '../../common/strategies/jwt.strategy';

@Injectable()
export class ElectionsService {
  constructor(private readonly firebase: FirebaseService) {}

  async findAll(): Promise<{ id: string; [key: string]: unknown }[]> {
    const snapshot = await this.firebase.db.collection('electionProcesses').get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  async findOne(id: string): Promise<{ id: string; [key: string]: unknown }> {
    const doc = await this.firebase.db.collection('electionProcesses').doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException(`Election ${id} not found`);
    }
    return { id: doc.id, ...doc.data() };
  }

  async create(dto: CreateElectionDto): Promise<{ id: string }> {
    const ref = await this.firebase.db.collection('electionProcesses').add({
      ...dto,
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
    });
    return { id: ref.id };
  }

  async update(id: string, dto: Partial<CreateElectionDto>): Promise<void> {
    const doc = await this.firebase.db.collection('electionProcesses').doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException(`Election ${id} not found`);
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

  async castVote(
    electionId: string,
    dto: CastVoteDto,
    user: JwtPayload,
  ): Promise<void> {
    const election = await this.firebase.db.collection('electionProcesses').doc(electionId).get();
    if (!election.exists) {
      throw new NotFoundException(`Election ${electionId} not found`);
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
