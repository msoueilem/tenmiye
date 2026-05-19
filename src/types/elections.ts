export interface ElectionOption {
  id: string;
  name: string;
  photoUrl?: string;
}

export type ElectionType = 'YES_NO' | 'NOMINATION' | 'PICK_MEMBER';

export interface ElectionConfig {
  pickMember?: {
    candidateUids?: string[];
    maxSelections?: number;
  };
  nomination?: {
    minPicks?: number;
    maxPicks?: number;
  };
}

// Backend election types (from NestJS API — electionProcesses collection)
export type BackendElectionType = 'board_election' | 'committee_election' | 'general_vote';
export type BackendElectionStatus = 'pending' | 'active' | 'completed' | 'cancelled';

export interface Election {
  id: string;
  title: string;
  description?: string;
  type: BackendElectionType;
  status: BackendElectionStatus;
  startTime: string;
  endTime: string;
  createdAt: string;
}

export interface Vote {
  id: string;
  electionId: string;
  voterId: string;
  selections: string[];
  votedAt: string;
}

export interface NominationCount {
  id: string;
  electionId: string;
  nomineeUid: string;
  count: number;
}

export interface PublicMember {
  id: string;
  name: string;
  photoUrl?: string;
  status?: string;
}

export interface ElectionResults {
  electionId: string;
  results: { selection: string; count: number }[];
}
