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
    this.reviewedAt,
    this.loanId,
  });

  final String id;
  final String applicantId;
  final String? reviewedById;
  final String requestedAmount;
  final int requestedTermMonths;
  final String? purpose;
  final String status;
  final DateTime submittedAt;
  final DateTime? reviewedAt;
  final String? loanId;

  factory LoanApplication.fromJson(Map<String, dynamic> json) {
    return LoanApplication(
      id: json['id'] as String,
      applicantId: json['applicantId'] as String,
      reviewedById: json['reviewedById'] as String?,
      requestedAmount: json['requestedAmount'] as String,
      requestedTermMonths: json['requestedTermMonths'] as int,
      purpose: json['purpose'] as String?,
      status: json['status'] as String,
      submittedAt: DateTime.parse(json['submittedAt'] as String),
      reviewedAt: json['reviewedAt'] != null ? DateTime.parse(json['reviewedAt'] as String) : null,
      loanId: json['loanId'] as String?,
    );
  }
}
