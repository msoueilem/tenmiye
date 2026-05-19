export type BoardStatus = 'upcoming' | 'active' | 'archived';

export interface Achievement {
  title: string;
  description?: string;
  date?: string;
}

export interface Board {
  id: string;
  name: string;
  description?: string;
  roleIds?: string[];
  logoUploadId?: string;
  logoUrl?: string;
  termStartDate: string;
  termEndDate: string;
  status?: BoardStatus;
  mandates?: string;
  obligations?: string;
  achievements?: Achievement[];
  electionId?: string;
  predecessorBoardId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBoardDto {
  name: string;
  description?: string;
  roleIds?: string[];
  logoUploadId?: string;
  termStartDate: string;
  termEndDate: string;
  status?: BoardStatus;
  mandates?: string;
  obligations?: string;
  achievements?: Achievement[];
  electionId?: string;
  predecessorBoardId?: string;
}

export interface UpdateBoardDto extends Partial<CreateBoardDto> {}
