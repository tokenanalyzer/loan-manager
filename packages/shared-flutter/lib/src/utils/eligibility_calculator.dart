/// Indicative loan-eligibility estimate — a real, disclosed formula
/// (not a random/fabricated number), using the same FOIR
/// (Fixed-Obligation-to-Income-Ratio) approach real Indian lenders use:
///
/// 1. `affordableEmi` = 50% of gross monthly income, minus EMIs the
///    customer already carries on other loans — the portion of income
///    a lender would consider available to service a *new* EMI.
/// 2. That affordable EMI is reverse-computed into a principal amount
///    using the category's own tenure and indicative rate — the
///    inverse of `calculateEmi`. This is why a Home Loan (long tenure)
///    shows a much higher eligible amount than a Personal Loan (short
///    tenure) for the *same* income: the math is the same reducing-
///    balance formula, just run backwards.
/// 3. Clamped to the category's own `maxAmount` — never advertise more
///    than the product actually offers.
///
/// Always presented to the customer as an indicative estimate subject
/// to verification (mirrors the disclosure language RBI's Digital
/// Lending Guidelines expect for anything resembling a pre-approved
/// offer) — this function never claims to be a guaranteed approval.
double estimateEligibleAmount({
  required double monthlyIncome,
  required double existingMonthlyEmiObligations,
  required int tenureMonths,
  required double annualRatePercent,
  required double categoryMaxAmount,
  double foirCap = 0.5,
}) {
  final affordableEmi =
      (monthlyIncome * foirCap) - existingMonthlyEmiObligations;
  if (affordableEmi <= 0 || tenureMonths <= 0) {
    return 0;
  }

  if (annualRatePercent <= 0) {
    final flatPrincipal = affordableEmi * tenureMonths;
    return flatPrincipal.clamp(0, categoryMaxAmount).toDouble();
  }

  final monthlyRate = annualRatePercent / 12 / 100;
  final factor = _pow1p(monthlyRate, tenureMonths);
  final principal = affordableEmi * (factor - 1) / (monthlyRate * factor);

  return principal.clamp(0, categoryMaxAmount).toDouble();
}

double _pow1p(double rate, int months) {
  var result = 1.0;
  final base = 1 + rate;
  for (var i = 0; i < months; i++) {
    result *= base;
  }
  return result;
}
