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
    this.loanId,
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
  final String? loanId;

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
      loanId: json['loanId'] as String?,
      propertyType: json['propertyType'] as String?,
      propertyOwnership: json['propertyOwnership'] as String?,
      propertyAddress: json['propertyAddress'] as String?,
      propertyValue: json['propertyValue'] as String?,
      hasExistingLoanOnProperty: json['hasExistingLoanOnProperty'] as bool?,
      existingLoanOutstandingAmount: json['existingLoanOutstandingAmount'] as String?,
    );
  }
}
