export interface Tier {
  id: string;
  name: string;
  slug: string;
  description?: string;
  monthlyAmount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTierDto {
  name: string;
  slug: string;
  description?: string;
  monthlyAmount: number;
  isActive?: boolean;
}

export interface UpdateTierDto extends Partial<CreateTierDto> {}
