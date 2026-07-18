import { ArrayMinSize, ArrayUnique, IsArray, IsUUID } from 'class-validator';

/** Admin-selected multi-lead transfer to a single destination employee. */
export class TransferSelectedLeadsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  applicationIds!: string[];

  @IsUUID()
  employeeId!: string;
}
