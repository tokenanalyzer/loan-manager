/**
 * Adds `termMonths` to a disbursement date to produce the loan's
 * maturity date, returned as a `YYYY-MM-DD` string (the `loans.maturity_date`
 * column is a `date`, not a `timestamptz`). Uses UTC calendar math so the
 * result never shifts with the server's local timezone.
 */
export function calculateMaturityDate(disbursedAt: Date, termMonths: number): string {
  const maturity = new Date(
    Date.UTC(disbursedAt.getUTCFullYear(), disbursedAt.getUTCMonth(), disbursedAt.getUTCDate()),
  );
  maturity.setUTCMonth(maturity.getUTCMonth() + termMonths);
  return maturity.toISOString().slice(0, 10);
}
