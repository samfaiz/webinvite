import { IsBoolean, IsOptional, IsString } from 'class-validator';

/** Outgoing-email configuration set by an admin. Empty strings clear a value;
 *  an omitted `smtpPass` keeps the stored password. */
export class MailSettingsDto {
  @IsOptional() @IsString() fromName?: string;
  @IsOptional() @IsString() fromEmail?: string;
  @IsOptional() @IsString() smtpHost?: string;
  @IsOptional() @IsString() smtpPort?: string;
  @IsOptional() @IsString() smtpUser?: string;
  @IsOptional() @IsString() smtpPass?: string;
  @IsOptional() @IsBoolean() enabled?: boolean;
}

export class TestMailDto {
  @IsString() to!: string;
}
