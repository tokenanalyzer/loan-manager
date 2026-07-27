import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';

/**
 * CaseNumberService — generates the permanent, atomically-issued
 * Business ID (`LM-{year}-{6-digit}`) for a Loan Application.
 *
 * `manager` is required, not optional (unlike
 * `NotificationsService.createForUser`'s convenience optional-manager
 * pattern): the counter increment MUST run inside the caller's
 * transaction, since a rollback elsewhere must not leave a case number
 * "issued" against a row that was never actually created. The single
 * `INSERT ... ON CONFLICT ... DO UPDATE ... RETURNING` statement below
 * is the entire uniqueness/atomicity guarantee — the `UPDATE` branch
 * takes a row lock on that year's counter row, so two concurrent
 * submissions in the same year can never observe or return the same
 * value. This is deliberately a different, stronger mechanism than
 * `LoanRepository.generateLoanNumber()` (random + DB-constraint-as-
 * safety-net, which tolerates collisions) — that identifier has looser
 * requirements and is untouched by this change.
 */
@Injectable()
export class CaseNumberService {
  async generate(manager: EntityManager, submittedAt: Date = new Date()): Promise<string> {
    const year = submittedAt.getFullYear();

    const rows: Array<{ last_value: number }> = await manager.query(
      `INSERT INTO case_number_counters (year, last_value) VALUES ($1, 1)
       ON CONFLICT (year) DO UPDATE SET last_value = case_number_counters.last_value + 1
       RETURNING last_value`,
      [year],
    );
    const sequence = rows[0].last_value;

    return `LM-${year}-${String(sequence).padStart(6, '0')}`;
  }
}
