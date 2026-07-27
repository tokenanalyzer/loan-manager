import type { EntityManager } from 'typeorm';

import { CaseNumberService } from './case-number.service';

/**
 * `CaseNumberService` — unit-tests the formatting/SQL-shape of case
 * number generation against a mocked `EntityManager.query`.
 *
 * What this suite deliberately does NOT prove: true cross-request
 * atomicity under concurrent submissions. That guarantee comes from
 * the single `INSERT ... ON CONFLICT ... DO UPDATE ... RETURNING`
 * statement itself (the `UPDATE` branch takes a row lock on that
 * year's counter row at the database level) — a unit test against a
 * mocked query function can't exercise real Postgres locking, and this
 * repo has no live-DB concurrency/e2e test infrastructure today. The
 * migration/live-verification step (see the Case Number plan) is what
 * actually exercises the real statement against Postgres.
 */
describe('CaseNumberService', () => {
  function buildManager(lastValue: number): { manager: EntityManager; query: jest.Mock } {
    const query = jest.fn().mockResolvedValue([{ last_value: lastValue }]);
    const manager = { query } as unknown as EntityManager;
    return { manager, query };
  }

  it('formats the case number as LM-{year}-{6-digit zero-padded}', async () => {
    const service = new CaseNumberService();
    const { manager } = buildManager(1);

    const caseNumber = await service.generate(manager, new Date('2026-03-15'));

    expect(caseNumber).toBe('LM-2026-000001');
  });

  it('zero-pads sequence values under 6 digits and does not truncate values at/above it', async () => {
    const service = new CaseNumberService();

    const { manager: manager42 } = buildManager(42);
    expect(await service.generate(manager42, new Date('2026-01-01'))).toBe('LM-2026-000042');

    const { manager: managerBig } = buildManager(1_234_567);
    expect(await service.generate(managerBig, new Date('2026-01-01'))).toBe('LM-2026-1234567');
  });

  it('extracts the year from the supplied submittedAt, not the current date', async () => {
    const service = new CaseNumberService();
    const { manager, query } = buildManager(7);

    const caseNumber = await service.generate(manager, new Date('2027-11-30'));

    expect(caseNumber).toBe('LM-2027-000007');
    expect(query).toHaveBeenCalledWith(expect.stringContaining('case_number_counters'), [2027]);
  });

  it('defaults submittedAt to now when omitted', async () => {
    const service = new CaseNumberService();
    const { manager, query } = buildManager(1);

    await service.generate(manager);

    expect(query).toHaveBeenCalledWith(expect.any(String), [new Date().getFullYear()]);
  });

  it('issues the atomic upsert statement — INSERT ... ON CONFLICT ... DO UPDATE ... RETURNING', async () => {
    const service = new CaseNumberService();
    const { manager, query } = buildManager(1);

    await service.generate(manager, new Date('2026-01-01'));

    const [sql] = query.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO case_number_counters/);
    expect(sql).toMatch(/ON CONFLICT \(year\) DO UPDATE/);
    expect(sql).toMatch(/RETURNING last_value/);
  });
});
