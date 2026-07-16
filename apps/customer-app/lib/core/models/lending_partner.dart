/// A lending partner (bank/NBFC) shown on the Home dashboard's
/// Lending Partners section — mirrors the shape a future
/// `GET /v1/lending-partners` endpoint (Admin Panel/Bank Portal work,
/// not part of this sprint) is expected to return, so wiring the real
/// endpoint in later requires no model changes.
class LendingPartner {
  const LendingPartner({
    required this.id,
    required this.name,
    this.logoUrl,
    this.interestRateLabel,
    this.offerLabel,
  });

  final String id;
  final String name;
  final String? logoUrl;

  /// e.g. "From 10.5% p.a." — pre-formatted display text, not a raw
  /// number, since the exact wording is a partner-marketing decision.
  final String? interestRateLabel;

  /// e.g. "Zero processing fee this month".
  final String? offerLabel;

  factory LendingPartner.fromJson(Map<String, dynamic> json) {
    return LendingPartner(
      id: json['id'] as String,
      name: json['name'] as String,
      logoUrl: json['logoUrl'] as String?,
      interestRateLabel: json['interestRateLabel'] as String?,
      offerLabel: json['offerLabel'] as String?,
    );
  }
}
