import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SubmitContactMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsEmail()
  @MaxLength(200)
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  subject?: string;

  @IsString()
  @MinLength(5)
  @MaxLength(5000)
  message!: string;

  /** Optional label so we can tell which surface sent it ("contact-page", "footer"). */
  @IsOptional()
  @IsString()
  @MaxLength(40)
  source?: string;
}
