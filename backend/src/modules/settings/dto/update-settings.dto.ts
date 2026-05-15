import { IsOptional, IsString, IsNumber, IsArray, ValidateNested, IsUrl } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

class TeamMemberDto {
  @IsString() name!: string;
  @IsString() title!: string;
  @IsOptional() @IsUrl() photo?: string;
}

class TeamDto {
  @IsString() team_name!: string;
  @ValidateNested() @Type(() => TeamMemberDto) head!: TeamMemberDto;
  @IsArray() @ValidateNested({ each: true }) @Type(() => TeamMemberDto) members!: TeamMemberDto[];
}

class InitiativeDto {
  @IsString() title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsUrl() imageUrl?: string;
}

class ContactInfoDto {
  @IsString() whatsapp!: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() address?: string;
}

class CurrentAspectDto {
  @IsString() title!: string;
  @IsString() subTitle!: string;
  @IsUrl() imageUrl!: string;
}

class TeamHierarchyDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => TeamDto) teams!: TeamDto[];
}

export class UpdateSettingsDto {
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional() @IsOptional() @IsUrl() logoUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsUrl() faviconUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() aboutText?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() membersCount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() projectsCount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() activeProjectsCount?: number;
  @ApiPropertyOptional() @IsOptional() @ValidateNested() @Type(() => ContactInfoDto) contact?: ContactInfoDto;
  @ApiPropertyOptional() @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => InitiativeDto) initiatives?: InitiativeDto[];
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) achievements?: string[];
  @ApiPropertyOptional() @IsOptional() @ValidateNested() @Type(() => TeamHierarchyDto) teamHierarchy?: TeamHierarchyDto;
  @ApiPropertyOptional() @IsOptional() @ValidateNested() @Type(() => CurrentAspectDto) currentAspect?: CurrentAspectDto;
}
