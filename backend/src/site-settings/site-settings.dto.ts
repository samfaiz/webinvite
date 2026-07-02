import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsHexColor,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

const hexOrBlank = (): PropertyDecorator => (target, key) => {
  // Composed: allow "" (defaults) OR a valid 3/4/6/8-digit hex colour.
  ValidateIf((_, v) => v !== '' && v !== null && v !== undefined)(target, key);
  IsHexColor()(target, key);
};

export class SiteBrandingDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  brandName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  logo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  logoDark?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  favicon?: string;
}

export class SiteHeroDto {
  @IsOptional()
  @IsString()
  @MaxLength(280)
  tagline?: string;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  heroHeadline?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  heroSubheadline?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  valueProposition?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  mission?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  primaryCtaLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  primaryCtaUrl?: string;
}

export class SiteContactDto {
  // ValidateIf lets the field be empty (clearing it) OR a valid email.
  @IsOptional()
  @ValidateIf((_, v) => v !== '')
  @IsEmail()
  @MaxLength(200)
  contactEmail?: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== '')
  @IsEmail()
  @MaxLength(200)
  careersEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  responseTime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  officeHours?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  calendarUrl?: string;
}

export class SocialLinkDto {
  @IsString()
  @MaxLength(40)
  platform!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  url?: string;
}

export class SiteSocialDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => SocialLinkDto)
  links?: SocialLinkDto[];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  footerMessage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  copyrightText?: string;
}

export class SiteThemeDto {
  @IsOptional() @IsString() @hexOrBlank() accent?: string;
  @IsOptional() @IsString() @hexOrBlank() accentSoft?: string;
  @IsOptional() @IsString() @hexOrBlank() textOnAccent?: string;

  @IsOptional() @IsString() @hexOrBlank() accentDark?: string;
  @IsOptional() @IsString() @hexOrBlank() accentSoftDark?: string;
  @IsOptional() @IsString() @hexOrBlank() textOnAccentDark?: string;

  @IsOptional() @IsString() @MaxLength(40) fontHeadings?: string;
  @IsOptional() @IsString() @MaxLength(40) fontBody?: string;
  @IsOptional() @IsString() @MaxLength(40) fontMono?: string;
}

export class SiteSeoDto {
  @IsOptional() @IsString() @MaxLength(200) metaTitle?: string;
  @IsOptional() @IsString() @MaxLength(500) metaDescription?: string;
  @IsOptional() @IsString() @MaxLength(2000) ogImage?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  keywords?: string[];

  @IsOptional() @IsString() @MaxLength(40) metaPixelId?: string;
  @IsOptional() @IsString() @MaxLength(60) orgSchemaType?: string;
  @IsOptional() @IsString() @MaxLength(10) orgFoundedYear?: string;
}

export class SaveSiteSettingsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => SiteBrandingDto)
  branding?: SiteBrandingDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SiteHeroDto)
  hero?: SiteHeroDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SiteContactDto)
  contact?: SiteContactDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SiteSocialDto)
  social?: SiteSocialDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SiteThemeDto)
  theme?: SiteThemeDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SiteSeoDto)
  seo?: SiteSeoDto;
}
