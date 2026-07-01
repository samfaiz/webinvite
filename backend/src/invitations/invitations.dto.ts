import { IsObject, IsOptional, IsString } from 'class-validator';

export class SaveInvitationDto {
  @IsString()
  templateId!: string;

  @IsString()
  themeId!: string;

  @IsString()
  motifId!: string;

  @IsObject()
  theme!: Record<string, unknown>;

  @IsObject()
  content!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  ownerEmail?: string;
}
