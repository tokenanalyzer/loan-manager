/// Mirrors the backend's `CustomerSummaryResponseDto` — the CRM
/// list/detail identity shape (no full profile fields).
class CustomerSummary {
  const CustomerSummary({
    required this.id,
    required this.isActive,
    this.fullName,
    this.email,
    this.phone,
  });

  final String id;
  final String? fullName;
  final String? email;
  final String? phone;
  final bool isActive;

  factory CustomerSummary.fromJson(Map<String, dynamic> json) {
    return CustomerSummary(
      id: json['id'] as String,
      fullName: json['fullName'] as String?,
      email: json['email'] as String?,
      phone: json['phone'] as String?,
      isActive: json['isActive'] as bool,
    );
  }
}
