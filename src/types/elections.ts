export interface ElectionOption {
  id: string;
  label: string;
}

export type BackendElectionType = 'yes_no' | 'multiple_choice' | 'board';
export type BackendElectionStatus = 'draft' | 'nomination' | 'dismissal' | 'voting' | 'completed' | 'cancelled';

export interface Election {
  id: string;
  title: string;
  description?: string;
  type: BackendElectionType;
  status: BackendElectionStatus;
  options?: ElectionOption[];
  boardConfig?: { seatsCount: number; targetNominees?: number; shortlistCount?: number; dismissalWindowHours?: number };
  startTime?: string;
  endTime?: string;
  nominationStart?: string;
  nominationEnd?: string;
  dismissalStart?: string;
  dismissalEnd?: string;
  votingStart?: string;
  votingEnd?: string;
  createdAt: string;
}

export interface Vote {
  id: string;
  electionId: string;
  voterId: string;
  selections: string[];
  votedAt: string;
}

export interface ElectionResults {
  electionId: string;
  results: { selection: string; count: number }[];
}

export interface PublicMember {
  id: string;
  name: string;
  photoUrl?: string;
  status?: string;
}

export interface NominationCount {
  id: string;
  electionId: string;
  nomineeUid: string;
  count: number;
}
