import 'emi_calculator.dart';

/// The full Key-Fact-Statement-style cost breakdown for a loan — not
/// just the bare EMI. Mirrors what RBI's Digital Lending Guidelines
/// expect digital lenders to disclose upfront: the EMI, total
/// interest, one-time processing fee, GST on that fee, and the amount
/// actually disbursed net of those upfront deductions.
class LoanCostBreakdown {
  const LoanCostBreakdown({
    required this.principal,
    required this.monthlyInstallment,
    required this.totalInterest,
    required this.totalPayable,
    required this.processingFee,
    required this.gstOnFee,
    required this.netDisbursed,
  });

  final double principal;
  final double monthlyInstallment;
  final double totalInterest;
  final double totalPayable;
  final double processingFee;
  final double gstOnFee;

  /// What actually lands in the customer's account — principal minus
  /// the processing fee and GST, both deducted upfront rather than
  /// added to the EMI.
  final double netDisbursed;
}

/// GST rate applied to loan-processing fees under Indian tax law.
const double kProcessingFeeGstRate = 0.18;

LoanCostBreakdown computeLoanCostBreakdown({
  required double principal,
  required double annualRatePercent,
  required int tenureMonths,
  required double processingFeePercent,
}) {
  final emi = calculateEmi(
    principal: principal,
    annualRatePercent: annualRatePercent,
    tenureMonths: tenureMonths,
  );

  final processingFee = principal * processingFeePercent;
  final gstOnFee = processingFee * kProcessingFeeGstRate;

  return LoanCostBreakdown(
    principal: principal,
    monthlyInstallment: emi.monthlyInstallment,
    totalInterest: emi.totalInterest,
    totalPayable: emi.totalPayable,
    processingFee: processingFee,
    gstOnFee: gstOnFee,
    netDisbursed: principal - processingFee - gstOnFee,
  );
}
