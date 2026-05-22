export interface Tier {
  id: string;
  name: string;
  slug: string;
  description?: string;
  monthlyAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTierDto {
  name: string;
  slug: string;
  description?: string;
  monthlyAmount: number;
}

export interface UpdateTierDto extends Partial<CreateTierDto> {}
