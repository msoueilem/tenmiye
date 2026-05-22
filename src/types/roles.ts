export interface Role {
  id: string;
  name: string;
  slug: string;
  description?: string;
  responsibilities?: string[];
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoleDto {
  name: string;
  slug: string;
  description?: string;
  responsibilities?: string[];
  permissions: string[];
}

export interface UpdateRoleDto extends Partial<CreateRoleDto> {}
