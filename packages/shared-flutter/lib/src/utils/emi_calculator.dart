/// Reducing-balance EMI (equated monthly installment) calculation —
/// the standard formula used by Indian banks/NBFCs for retail loans:
///
///   EMI = P × r × (1+r)^n / ((1+r)^n − 1)
///
/// where `r` is the *monthly* interest rate (annual rate / 12 / 100)
/// and `n` is the tenure in months. Mirrored server-side in
/// `apps/backend/src/loan-applications/utils/emi.util.ts` so both the
/// pre-submission indicative estimate (client-side, using a category's
/// representative rate) and the post-approval authoritative figure
/// (server-side, using the reviewer-set rate) come from the same
/// formula.
class EmiResult {
  const EmiResult({
    required this.monthlyInstallment,
    required this.totalInterest,
    required this.totalPayable,
  });

  final double monthlyInstallment;
  final double totalInterest;
  final double totalPayable;
}

EmiResult calculateEmi({
  required double principal,
  required double annualRatePercent,
  required int tenureMonths,
}) {
  if (principal <= 0 || tenureMonths <= 0) {
    return const EmiResult(
        monthlyInstallment: 0, totalInterest: 0, totalPayable: 0);
  }

  if (annualRatePercent <= 0) {
    final flat = principal / tenureMonths;
    return EmiResult(
      monthlyInstallment: flat,
      totalInterest: 0,
      totalPayable: principal,
    );
  }

  final monthlyRate = annualRatePercent / 12 / 100;
  final factor = _pow1p(monthlyRate, tenureMonths);
  final emi = principal * monthlyRate * factor / (factor - 1);
  final totalPayable = emi * tenureMonths;

  return EmiResult(
    monthlyInstallment: emi,
    totalInterest: totalPayable - principal,
    totalPayable: totalPayable,
  );
}

double _pow1p(double rate, int months) {
  var result = 1.0;
  final base = 1 + rate;
  for (var i = 0; i < months; i++) {
    result *= base;
  }
  return result;
}
