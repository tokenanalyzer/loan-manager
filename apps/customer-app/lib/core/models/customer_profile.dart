/// Mirrors the backend's `CustomerProfileResponseDto`.
class CustomerProfile {
  const CustomerProfile({
    required this.userId,
    required this.marketingConsent,
    required this.kycStatus,
    this.dateOfBirth,
    this.panNumber,
    this.aadhaarLast4,
    this.kycRejectionReason,
    this.addressLine1,
    this.addressLine2,
    this.city,
    this.state,
    this.postalCode,
    this.country,
    this.employmentStatus,
    this.monthlyIncome,
    this.dataConsentAcceptedAt,
    this.bankAccountLast4,
    this.bankIfscCode,
    this.bankAccountHolderName,
    this.nomineeName,
    this.nomineeRelationship,
    this.nomineePhone,
    this.gender,
    this.maritalStatus,
    this.fatherName,
    this.motherName,
    this.residenceType,
    this.yearsAtCurrentAddress,
    this.permanentAddress,
    this.companyName,
    this.designation,
    this.joiningDate,
    this.officeAddress,
    this.officePhone,
    this.additionalIncome,
    this.currentMonthlyEmi,
    this.creditCardCount,
    this.creditCardOutstanding,
    this.existingLoansOutstanding,
    this.hasActiveExternalLoan,
    this.externalLoanLenderName,
    this.externalLoanOutstandingAmount,
    this.externalLoanAccountLast4,
    this.reference1Name,
    this.reference1Phone,
    this.reference1Relationship,
    this.reference2Name,
    this.reference2Phone,
    this.reference2Relationship,
  });

  final String userId;
  final String? dateOfBirth;
  final String? panNumber;
  final String? aadhaarLast4;

  /// One of `not_submitted`, `pending_review`, `verified`, `rejected`.
  final String kycStatus;
  final String? kycRejectionReason;
  final String? addressLine1;
  final String? addressLine2;
  final String? city;
  final String? state;
  final String? postalCode;
  final String? country;
  final String? employmentStatus;
  final String? monthlyIncome;
  final bool marketingConsent;
  final DateTime? dataConsentAcceptedAt;
  final String? bankAccountLast4;
  final String? bankIfscCode;
  final String? bankAccountHolderName;
  final String? nomineeName;
  final String? nomineeRelationship;
  final String? nomineePhone;

  // Full application-form fields (Phase 1).
  final String? gender;
  final String? maritalStatus;
  final String? fatherName;
  final String? motherName;
  final String? residenceType;
  final int? yearsAtCurrentAddress;
  final String? permanentAddress;
  final String? companyName;
  final String? designation;
  final String? joiningDate;
  final String? officeAddress;
  final String? officePhone;
  final String? additionalIncome;
  final String? currentMonthlyEmi;
  final int? creditCardCount;
  final String? creditCardOutstanding;
  final String? existingLoansOutstanding;

  /// Balance Transfer signal — see the backend's
  /// `LoanJourneyDetectionService`. When true (and lender/amount are
  /// filled in), a Personal Loan application auto-detects as
  /// `BALANCE_TRANSFER` (or `BT_TOPUP` if the customer also has an
  /// active loan with us) instead of `FRESH_LOAN` — no manual journey
  /// picker anywhere in the app.
  final bool? hasActiveExternalLoan;
  final String? externalLoanLenderName;
  final String? externalLoanOutstandingAmount;
  final String? externalLoanAccountLast4;

  final String? reference1Name;
  final String? reference1Phone;
  final String? reference1Relationship;
  final String? reference2Name;
  final String? reference2Phone;
  final String? reference2Relationship;

  bool get isKycComplete => kycStatus == 'pending_review' || kycStatus == 'verified';

  /// Whether the customer's declared identity/address/employment/
  /// income facts are on file — the wizard pre-fills from these and
  /// treats them as "already answered" for a returning applicant.
  bool get hasPersonalDetails =>
      gender != null && maritalStatus != null && fatherName != null && motherName != null;

  factory CustomerProfile.fromJson(Map<String, dynamic> json) {
    return CustomerProfile(
      userId: json['userId'] as String,
      dateOfBirth: json['dateOfBirth'] as String?,
      panNumber: json['panNumber'] as String?,
      aadhaarLast4: json['aadhaarLast4'] as String?,
      kycStatus: json['kycStatus'] as String? ?? 'not_submitted',
      kycRejectionReason: json['kycRejectionReason'] as String?,
      addressLine1: json['addressLine1'] as String?,
      addressLine2: json['addressLine2'] as String?,
      city: json['city'] as String?,
      state: json['state'] as String?,
      postalCode: json['postalCode'] as String?,
      country: json['country'] as String?,
      employmentStatus: json['employmentStatus'] as String?,
      monthlyIncome: json['monthlyIncome'] as String?,
      marketingConsent: json['marketingConsent'] as bool? ?? false,
      dataConsentAcceptedAt: json['dataConsentAcceptedAt'] != null
          ? DateTime.parse(json['dataConsentAcceptedAt'] as String)
          : null,
      bankAccountLast4: json['bankAccountLast4'] as String?,
      bankIfscCode: json['bankIfscCode'] as String?,
      bankAccountHolderName: json['bankAccountHolderName'] as String?,
      nomineeName: json['nomineeName'] as String?,
      nomineeRelationship: json['nomineeRelationship'] as String?,
      nomineePhone: json['nomineePhone'] as String?,
      gender: json['gender'] as String?,
      maritalStatus: json['maritalStatus'] as String?,
      fatherName: json['fatherName'] as String?,
      motherName: json['motherName'] as String?,
      residenceType: json['residenceType'] as String?,
      yearsAtCurrentAddress: json['yearsAtCurrentAddress'] as int?,
      permanentAddress: json['permanentAddress'] as String?,
      companyName: json['companyName'] as String?,
      designation: json['designation'] as String?,
      joiningDate: json['joiningDate'] as String?,
      officeAddress: json['officeAddress'] as String?,
      officePhone: json['officePhone'] as String?,
      additionalIncome: json['additionalIncome'] as String?,
      currentMonthlyEmi: json['currentMonthlyEmi'] as String?,
      creditCardCount: json['creditCardCount'] as int?,
      creditCardOutstanding: json['creditCardOutstanding'] as String?,
      existingLoansOutstanding: json['existingLoansOutstanding'] as String?,
      hasActiveExternalLoan: json['hasActiveExternalLoan'] as bool?,
      externalLoanLenderName: json['externalLoanLenderName'] as String?,
      externalLoanOutstandingAmount: json['externalLoanOutstandingAmount'] as String?,
      externalLoanAccountLast4: json['externalLoanAccountLast4'] as String?,
      reference1Name: json['reference1Name'] as String?,
      reference1Phone: json['reference1Phone'] as String?,
      reference1Relationship: json['reference1Relationship'] as String?,
      reference2Name: json['reference2Name'] as String?,
      reference2Phone: json['reference2Phone'] as String?,
      reference2Relationship: json['reference2Relationship'] as String?,
    );
  }
}
