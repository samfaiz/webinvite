import { IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';

export class SaveDesignDto {
  @IsString()
  name!: string;

  @IsString()
  community!: string;

  /** explore taxonomy — optional so existing admin payloads keep working */
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  country?: string;

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

export class ReactDto {
  /** "like" | "save" */
  @IsString()
  kind!: string;
}
