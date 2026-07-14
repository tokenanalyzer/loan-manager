/**
 * Renders a NUMERIC-column string as an Indian-Rupee amount with
 * Indian digit grouping (₹12,34,567.00 — last 3 digits, then pairs of
 * 2), mirroring `Formatters.currency` in `packages/shared-flutter`
 * (see that file for why both apps and the backend format amounts
 * identically). Used for notification copy, which is plain text sent
 * to the client rather than a number the client formats itself.
 */
export function formatInr(amount: string): string {
  const value = Number(amount);
  if (Number.isNaN(value)) {
    return `₹${amount}`;
  }

  const isNegative = value < 0;
  const fixed = Math.abs(value).toFixed(2);
  const [wholePart, decimalPart] = fixed.split('.');

  return `${isNegative ? '-' : ''}₹${groupIndian(wholePart)}.${decimalPart}`;
}

function groupIndian(wholePart: string): string {
  if (wholePart.length <= 3) return wholePart;

  const lastThree = wholePart.slice(-3);
  let remaining = wholePart.slice(0, -3);

  const groups: string[] = [];
  while (remaining.length > 2) {
    groups.unshift(remaining.slice(-2));
    remaining = remaining.slice(0, -2);
  }
  if (remaining.length > 0) {
    groups.unshift(remaining);
  }

  return `${groups.join(',')},${lastThree}`;
}
