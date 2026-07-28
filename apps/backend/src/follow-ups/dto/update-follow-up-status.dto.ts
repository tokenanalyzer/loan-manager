import { IsIn } from 'class-validator';

/** Marks a follow-up done/cancelled — `PATCH /v1/follow-ups/:id/status`. Pending is never set here; a follow-up starts pending on creation and only ever moves forward. */
export class UpdateFollowUpStatusDto {
  @IsIn(['done', 'cancelled'])
  status!: 'done' | 'cancelled';
}
