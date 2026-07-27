import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * CaseNumberCounterEntity — one row per calendar year, tracking the
 * last-issued sequence number for that year's Case Numbers
 * (`LM-{year}-{6-digit}`, see `CaseNumberService`). Deliberately not
 * extending `AbstractEntity`: a pure counter has no need for an id,
 * timestamps, or soft-delete (same reasoning `AuditLogEntity` already
 * applies for not extending it).
 *
 * Written only via the atomic `INSERT ... ON CONFLICT ... DO UPDATE
 * ... RETURNING` statement in `CaseNumberService.generate` — never
 * read or written any other way, so no repository wraps this entity.
 */
@Entity('case_number_counters')
export class CaseNumberCounterEntity {
  @PrimaryColumn({ type: 'int' })
  year!: number;

  @Column({ type: 'int', default: 0 })
  lastValue!: number;
}
