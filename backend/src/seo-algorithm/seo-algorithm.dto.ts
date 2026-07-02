import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export const ALLOWED_FREQUENCIES = ['daily', 'weekly', 'monthly'] as const;
export type AlgoFrequency = (typeof ALLOWED_FREQUENCIES)[number];

/**
 * Body for PUT /admin/seo-algorithm. Every field is optional so the admin
 * form can send a partial patch, and the service persists whatever is
 * present. When either `algorithm` or `learningMemory` differs from the
 * current version, a new version is archived.
 */
export class SaveSeoAlgorithmDto {
  @IsOptional()
  @IsString()
  @MaxLength(200_000)
  algorithm?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200_000)
  learningMemory?: string;

  @IsOptional()
  @IsBoolean()
  autoImprove?: boolean;

  @IsOptional()
  @IsIn(ALLOWED_FREQUENCIES as unknown as string[])
  frequency?: AlgoFrequency;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(365)
  versionsToKeep?: number;
}
