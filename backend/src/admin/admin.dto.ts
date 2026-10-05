import { IsNotEmpty, IsString } from 'class-validator';

/** Move an invitation onto a saved design. */
export class ChangeDesignDto {
  @IsString() @IsNotEmpty() designId!: string;
}

/** Put an invitation's previous look back — the snapshot `changeDesign`
 *  returned, sent back unchanged by the admin's "Undo". */
export class RestoreDesignDto {
  @IsString() @IsNotEmpty() templateId!: string;
  @IsString() @IsNotEmpty() themeId!: string;
  @IsString() @IsNotEmpty() motifId!: string;
  @IsString() @IsNotEmpty() themeJson!: string;
}
