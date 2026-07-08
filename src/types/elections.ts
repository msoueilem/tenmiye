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
  nominees?: ElectionNominee[];
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
  results: { selection: string; count: number; label?: string }[];
}

export interface PublicMember {
  id: string;
  fullName: string;
  fullNameAr?: string | null;
  fullNameFr?: string | null;
  phoneNumber?: string | null;
  whatsappNumber?: string | null;
  photoUrl?: string | null;
}

export interface ElectionNominee {
  userId: string;
  status: 'pending' | 'confirmed' | 'dismissed';
  addedInRound: number;
}

export interface NominationCount {
  id: string;
  electionId: string;
  nomineeUid: string;
  count: number;
}
