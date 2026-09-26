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

/** The catering options the RSVP form offers. Kept here so the validator and
 *  any future admin summary agree on the exact strings. */
export const MEALS = ['veg', 'non-veg', 'jain'] as const;

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

  /** catering preference — a closed set so the couple's headcount per menu
   *  is countable; omitted entirely when the guest skips the question */
  @IsOptional()
  @IsIn(MEALS)
  meal?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @IsOptional()
  @IsBoolean()
  subscribed?: boolean;
}
