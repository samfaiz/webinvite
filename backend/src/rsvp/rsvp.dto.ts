import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateRsvpDto {
  @IsString()
  @MaxLength(120)
  guestName!: string;

  @IsIn(['accept', 'decline'])
  attending!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  guests?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @IsOptional()
  @IsBoolean()
  subscribed?: boolean;
}
