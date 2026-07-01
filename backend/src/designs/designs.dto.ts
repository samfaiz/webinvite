import { IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';

export class SaveDesignDto {
  @IsString()
  name!: string;

  @IsString()
  community!: string;

  @IsString()
  templateId!: string;

  @IsObject()
  colors!: Record<string, unknown>;

  @IsObject()
  fonts!: Record<string, unknown>;

  @IsObject()
  particles!: Record<string, unknown>;

  @IsObject()
  backgrounds!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  previewUrl?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
