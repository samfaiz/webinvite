import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class SaveTrackDto {
  @IsString() title!: string;

  @IsOptional() @IsString() mood?: string;

  @IsString() url!: string;

  @IsOptional() @IsBoolean() active?: boolean;
}
