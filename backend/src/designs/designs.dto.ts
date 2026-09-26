import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

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

/** The parts of a design that can be pushed back onto invitations. */
export const REAPPLY_PARTS = ['backgrounds', 'colors', 'fonts', 'particles'] as const;

export class ReapplyDesignDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(REAPPLY_PARTS, { each: true })
  parts!: string[];
}

export class ReactDto {
  /** "like" | "save" */
  @IsString()
  kind!: string;

  /** Browser-generated id, sent when the visitor is not signed in. */
  @IsOptional()
  @IsString()
  guestKey?: string;
}
