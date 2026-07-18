import { IsUUID } from 'class-validator';

/** The source employee is the `:employeeId` route param; this is just the destination. */
export class TransferAllLeadsDto {
  @IsUUID()
  toEmployeeId!: string;
}
