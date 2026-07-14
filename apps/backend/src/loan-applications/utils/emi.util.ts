/**
 * Reducing-balance EMI (equated monthly installment) calculation —
 * the standard formula used by Indian banks/NBFCs for retail loans.
 * Mirrors `calculateEmi` in
 * `packages/shared-flutter/lib/src/utils/emi_calculator.dart` (see
 * that file for the formula) so the client's pre-submission indicative
 * estimate and this authoritative post-approval figure agree.
 */
export interface EmiResult {
  monthlyInstallment: number;
  totalInterest: number;
  totalPayable: number;
}

export function calculateEmi(
  principal: number,
  annualRatePercent: number,
  tenureMonths: number,
): EmiResult {
  if (principal <= 0 || tenureMonths <= 0) {
    return { monthlyInstallment: 0, totalInterest: 0, totalPayable: 0 };
  }

  if (annualRatePercent <= 0) {
    const flat = principal / tenureMonths;
    return { monthlyInstallment: flat, totalInterest: 0, totalPayable: principal };
  }

  const monthlyRate = annualRatePercent / 12 / 100;
  const factor = Math.pow(1 + monthlyRate, tenureMonths);
  const emi = (principal * monthlyRate * factor) / (factor - 1);
  const totalPayable = emi * tenureMonths;

  return {
    monthlyInstallment: emi,
    totalInterest: totalPayable - principal,
    totalPayable,
  };
}
