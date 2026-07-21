/// Mirrors the backend's `LoanResponseDto` — the created loan's core
/// terms plus server-computed EMI figures (reducing-balance formula,
/// see `apps/backend/src/loan-applications/utils/emi.util.ts`).
class LoanDetails {
  const LoanDetails({
    required this.id,
    required this.loanNumber,
    required this.principalAmount,
    required this.interestRate,
    required this.termMonths,
    required this.status,
    required this.monthlyInstallment,
    required this.totalInterest,
    required this.totalPayable,
    this.disbursedAt,
    this.maturityDate,
  });

  final String id;
  final String loanNumber;
  final String principalAmount;
  final String interestRate;
  final int termMonths;
  final String status;
  final DateTime? disbursedAt;
  final String? maturityDate;
  final double monthlyInstallment;
  final double totalInterest;
  final double totalPayable;

  factory LoanDetails.fromJson(Map<String, dynamic> json) {
    return LoanDetails(
      id: json['id'] as String,
      loanNumber: json['loanNumber'] as String,
      principalAmount: json['principalAmount'] as String,
      interestRate: json['interestRate'] as String,
      termMonths: json['termMonths'] as int,
      status: json['status'] as String,
      disbursedAt: json['disbursedAt'] != null
          ? DateTime.parse(json['disbursedAt'] as String)
          : null,
      maturityDate: json['maturityDate'] as String?,
      monthlyInstallment: (json['monthlyInstallment'] as num).toDouble(),
      totalInterest: (json['totalInterest'] as num).toDouble(),
      totalPayable: (json['totalPayable'] as num).toDouble(),
    );
  }
}

/// Mirrors the backend's `LoanApplicationResponseDto`.
///
/// Phase 5 scope: a plain data model — no business logic (status
/// transitions, validation) lives on the client; the backend is the
/// single source of truth for those rules.
class LoanApplication {
  const LoanApplication({
    required this.id,
    required this.applicantId,
    required this.requestedAmount,
    required this.requestedTermMonths,
    required this.status,
    required this.submittedAt,
    this.reviewedById,
    this.purpose,
    this.categoryId,
    this.reviewedAt,
    this.rejectionReason,
    this.queryMessage,
    this.queryRaisedAt,
    this.queryRespondedAt,
    this.loanId,
    this.loan,
    this.propertyType,
    this.propertyOwnership,
    this.propertyAddress,
    this.propertyValue,
    this.hasExistingLoanOnProperty,
    this.existingLoanOutstandingAmount,
  });

  final String id;
  final String applicantId;
  final String? reviewedById;
  final String requestedAmount;
  final int requestedTermMonths;
  final String? purpose;
  final String? categoryId;
  final String status;
  final DateTime submittedAt;
  final DateTime? reviewedAt;
  final String? rejectionReason;

  /// Customer↔Employee query workflow — set when [status] is
  /// `query_raised`; mirrors the backend's `LoanApplicationResponseDto`.
  final String? queryMessage;
  final DateTime? queryRaisedAt;
  final DateTime? queryRespondedAt;
  final String? loanId;
  final LoanDetails? loan;

  /// Loan Against Property (`categoryId: 'lap'`) collateral facts — null for every other category.
  final String? propertyType;
  final String? propertyOwnership;
  final String? propertyAddress;
  final String? propertyValue;
  final bool? hasExistingLoanOnProperty;
  final String? existingLoanOutstandingAmount;

  factory LoanApplication.fromJson(Map<String, dynamic> json) {
    return LoanApplication(
      id: json['id'] as String,
      applicantId: json['applicantId'] as String,
      reviewedById: json['reviewedById'] as String?,
      requestedAmount: json['requestedAmount'] as String,
      requestedTermMonths: json['requestedTermMonths'] as int,
      purpose: json['purpose'] as String?,
      categoryId: json['categoryId'] as String?,
      status: json['status'] as String,
      submittedAt: DateTime.parse(json['submittedAt'] as String),
      reviewedAt: json['reviewedAt'] != null
          ? DateTime.parse(json['reviewedAt'] as String)
          : null,
      rejectionReason: json['rejectionReason'] as String?,
      queryMessage: json['queryMessage'] as String?,
      queryRaisedAt: json['queryRaisedAt'] != null
          ? DateTime.parse(json['queryRaisedAt'] as String)
          : null,
      queryRespondedAt: json['queryRespondedAt'] != null
          ? DateTime.parse(json['queryRespondedAt'] as String)
          : null,
      loanId: json['loanId'] as String?,
      loan: json['loan'] != null
          ? LoanDetails.fromJson(json['loan'] as Map<String, dynamic>)
          : null,
      propertyType: json['propertyType'] as String?,
      propertyOwnership: json['propertyOwnership'] as String?,
      propertyAddress: json['propertyAddress'] as String?,
      propertyValue: json['propertyValue'] as String?,
      hasExistingLoanOnProperty: json['hasExistingLoanOnProperty'] as bool?,
      existingLoanOutstandingAmount: json['existingLoanOutstandingAmount'] as String?,
    );
  }
}
