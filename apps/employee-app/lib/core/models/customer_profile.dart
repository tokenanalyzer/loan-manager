/// Mirrors the backend's `CustomerProfileResponseDto`.
class CustomerProfile {
  const CustomerProfile({
    required this.userId,
    this.dateOfBirth,
    this.nationalIdNumber,
    this.addressLine1,
    this.addressLine2,
    this.city,
    this.state,
    this.postalCode,
    this.country,
    this.employmentStatus,
    this.monthlyIncome,
  });

  final String userId;
  final String? dateOfBirth;
  final String? nationalIdNumber;
  final String? addressLine1;
  final String? addressLine2;
  final String? city;
  final String? state;
  final String? postalCode;
  final String? country;
  final String? employmentStatus;
  final String? monthlyIncome;

  factory CustomerProfile.fromJson(Map<String, dynamic> json) {
    return CustomerProfile(
      userId: json['userId'] as String,
      dateOfBirth: json['dateOfBirth'] as String?,
      nationalIdNumber: json['nationalIdNumber'] as String?,
      addressLine1: json['addressLine1'] as String?,
      addressLine2: json['addressLine2'] as String?,
      city: json['city'] as String?,
      state: json['state'] as String?,
      postalCode: json['postalCode'] as String?,
      country: json['country'] as String?,
      employmentStatus: json['employmentStatus'] as String?,
      monthlyIncome: json['monthlyIncome'] as String?,
    );
  }
}
