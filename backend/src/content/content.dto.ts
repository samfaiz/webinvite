import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class FaqItemDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @MaxLength(500)
  question!: string;

  @IsString()
  @MaxLength(4000)
  answer!: string;
}

/** Create/update payload for a CMS document (page or blog post). */
export class SaveContentDto {
  @IsIn(['page', 'post'])
  type!: 'page' | 'post';

  @IsString()
  slug!: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  excerpt?: string;

  @IsOptional()
  @IsString()
  coverImage?: string;

  /** editor blocks (Block[] on the client) */
  @IsOptional()
  @IsArray()
  blocks?: unknown[];

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsString()
  authorName?: string;

  @IsOptional()
  @IsString()
  seoTitle?: string;

  @IsOptional()
  @IsString()
  seoDescription?: string;

  @IsOptional()
  @IsString()
  ogTitle?: string;

  @IsOptional()
  @IsString()
  ogDescription?: string;

  @IsOptional()
  @IsString()
  ogImage?: string;

  @IsOptional()
  @IsString()
  canonicalUrl?: string;

  /** answer-engine-optimisation FAQ list rendered on the public page + as JSON-LD */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => FaqItemDto)
  faqs?: FaqItemDto[];

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  noindex?: boolean;
}
