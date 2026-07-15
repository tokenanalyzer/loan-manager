import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/constants/application_wizard_steps.dart';
import '../../core/models/customer_profile.dart';
import '../../core/network/customer_profile_repository.dart';
import '../../core/network/loan_application_repository.dart';
import '../../core/riverpod/providers.dart';
import '../../core/utils/friendly_error.dart';
import '../profile/profile_providers.dart';

/// Full application-wizard state — one field per step. Every field
/// here maps 1:1 to a real, persisted `CustomerProfile` column (see
/// `customer_profile.dart`) or the loan application itself; nothing is
/// collected without somewhere real to save it. Pre-filled from the
/// customer's existing profile at construction so a returning
/// applicant isn't retyping facts already on file.
class LoanApplicationFormState {
  const LoanApplicationFormState({
    required this.steps,
    this.stepIndex = 0,
    this.categoryId,
    // Personal
    this.dateOfBirth,
    this.gender,
    this.maritalStatus,
    this.fatherName,
    this.motherName,
    // Address
    this.addressLine1,
    this.city,
    this.state,
    this.postalCode,
    this.residenceType,
    this.yearsAtCurrentAddress,
    this.permanentAddress,
    // Employment
    this.employmentStatus,
    this.companyName,
    this.designation,
    this.joiningDate,
    this.officeAddress,
    this.officePhone,
    // Income
    this.monthlyIncome,
    this.additionalIncome,
    this.bankAccountNumber,
    this.bankIfscCode,
    this.bankAccountHolderName,
    // Existing loans
    this.currentMonthlyEmi,
    this.creditCardCount,
    this.creditCardOutstanding,
    this.existingLoansOutstanding,
    // Loan requirement
    this.amount,
    this.termMonths,
    this.purpose,
    // Nominee
    this.nomineeName,
    this.nomineeRelationship,
    this.nomineePhone,
    // References
    this.reference1Name,
    this.reference1Phone,
    this.reference1Relationship,
    this.reference2Name,
    this.reference2Phone,
    this.reference2Relationship,
    this.isSubmitting = false,
    this.errorMessage,
  });

  final List<WizardStep> steps;
  final int stepIndex;
  final String? categoryId;

  final String? dateOfBirth;
  final String? gender;
  final String? maritalStatus;
  final String? fatherName;
  final String? motherName;

  final String? addressLine1;
  final String? city;
  final String? state;
  final String? postalCode;
  final String? residenceType;
  final int? yearsAtCurrentAddress;
  final String? permanentAddress;

  final String? employmentStatus;
  final String? companyName;
  final String? designation;
  final String? joiningDate;
  final String? officeAddress;
  final String? officePhone;

  final double? monthlyIncome;
  final double? additionalIncome;
  final String? bankAccountNumber;
  final String? bankIfscCode;
  final String? bankAccountHolderName;

  final double? currentMonthlyEmi;
  final int? creditCardCount;
  final double? creditCardOutstanding;
  final double? existingLoansOutstanding;

  final double? amount;
  final int? termMonths;
  final String? purpose;

  final String? nomineeName;
  final String? nomineeRelationship;
  final String? nomineePhone;

  final String? reference1Name;
  final String? reference1Phone;
  final String? reference1Relationship;
  final String? reference2Name;
  final String? reference2Phone;
  final String? reference2Relationship;

  final bool isSubmitting;
  final String? errorMessage;

  WizardStep get currentStep => steps[stepIndex];
  bool get isFirstStep => stepIndex == 0;
  bool get isLastStep => stepIndex == steps.length - 1;
  bool get canProceedFromAmountStep =>
      amount != null && amount! > 0 && termMonths != null && termMonths! > 0;

  LoanApplicationFormState copyWith({
    int? stepIndex,
    String? dateOfBirth,
    String? gender,
    String? maritalStatus,
    String? fatherName,
    String? motherName,
    String? addressLine1,
    String? city,
    String? state,
    String? postalCode,
    String? residenceType,
    int? yearsAtCurrentAddress,
    String? permanentAddress,
    String? employmentStatus,
    String? companyName,
    String? designation,
    String? joiningDate,
    String? officeAddress,
    String? officePhone,
    double? monthlyIncome,
    double? additionalIncome,
    String? bankAccountNumber,
    String? bankIfscCode,
    String? bankAccountHolderName,
    double? currentMonthlyEmi,
    int? creditCardCount,
    double? creditCardOutstanding,
    double? existingLoansOutstanding,
    double? amount,
    int? termMonths,
    String? purpose,
    String? nomineeName,
    String? nomineeRelationship,
    String? nomineePhone,
    String? reference1Name,
    String? reference1Phone,
    String? reference1Relationship,
    String? reference2Name,
    String? reference2Phone,
    String? reference2Relationship,
    bool? isSubmitting,
    String? errorMessage,
    bool clearError = false,
  }) {
    return LoanApplicationFormState(
      steps: steps,
      stepIndex: stepIndex ?? this.stepIndex,
      categoryId: categoryId,
      dateOfBirth: dateOfBirth ?? this.dateOfBirth,
      gender: gender ?? this.gender,
      maritalStatus: maritalStatus ?? this.maritalStatus,
      fatherName: fatherName ?? this.fatherName,
      motherName: motherName ?? this.motherName,
      addressLine1: addressLine1 ?? this.addressLine1,
      city: city ?? this.city,
      state: state ?? this.state,
      postalCode: postalCode ?? this.postalCode,
      residenceType: residenceType ?? this.residenceType,
      yearsAtCurrentAddress: yearsAtCurrentAddress ?? this.yearsAtCurrentAddress,
      permanentAddress: permanentAddress ?? this.permanentAddress,
      employmentStatus: employmentStatus ?? this.employmentStatus,
      companyName: companyName ?? this.companyName,
      designation: designation ?? this.designation,
      joiningDate: joiningDate ?? this.joiningDate,
      officeAddress: officeAddress ?? this.officeAddress,
      officePhone: officePhone ?? this.officePhone,
      monthlyIncome: monthlyIncome ?? this.monthlyIncome,
      additionalIncome: additionalIncome ?? this.additionalIncome,
      bankAccountNumber: bankAccountNumber ?? this.bankAccountNumber,
      bankIfscCode: bankIfscCode ?? this.bankIfscCode,
      bankAccountHolderName: bankAccountHolderName ?? this.bankAccountHolderName,
      currentMonthlyEmi: currentMonthlyEmi ?? this.currentMonthlyEmi,
      creditCardCount: creditCardCount ?? this.creditCardCount,
      creditCardOutstanding: creditCardOutstanding ?? this.creditCardOutstanding,
      existingLoansOutstanding: existingLoansOutstanding ?? this.existingLoansOutstanding,
      amount: amount ?? this.amount,
      termMonths: termMonths ?? this.termMonths,
      purpose: purpose ?? this.purpose,
      nomineeName: nomineeName ?? this.nomineeName,
      nomineeRelationship: nomineeRelationship ?? this.nomineeRelationship,
      nomineePhone: nomineePhone ?? this.nomineePhone,
      reference1Name: reference1Name ?? this.reference1Name,
      reference1Phone: reference1Phone ?? this.reference1Phone,
      reference1Relationship: reference1Relationship ?? this.reference1Relationship,
      reference2Name: reference2Name ?? this.reference2Name,
      reference2Phone: reference2Phone ?? this.reference2Phone,
      reference2Relationship: reference2Relationship ?? this.reference2Relationship,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }

  factory LoanApplicationFormState.fromProfile({
    required String? categoryId,
    required CustomerProfile? profile,
  }) {
    double? parse(String? value) => value != null ? double.tryParse(value) : null;

    return LoanApplicationFormState(
      steps: stepsForCategory(categoryId),
      categoryId: categoryId,
      dateOfBirth: profile?.dateOfBirth,
      gender: profile?.gender,
      maritalStatus: profile?.maritalStatus,
      fatherName: profile?.fatherName,
      motherName: profile?.motherName,
      addressLine1: profile?.addressLine1,
      city: profile?.city,
      state: profile?.state,
      postalCode: profile?.postalCode,
      residenceType: profile?.residenceType,
      yearsAtCurrentAddress: profile?.yearsAtCurrentAddress,
      permanentAddress: profile?.permanentAddress,
      employmentStatus: profile?.employmentStatus,
      companyName: profile?.companyName,
      designation: profile?.designation,
      joiningDate: profile?.joiningDate,
      officeAddress: profile?.officeAddress,
      officePhone: profile?.officePhone,
      monthlyIncome: parse(profile?.monthlyIncome),
      additionalIncome: parse(profile?.additionalIncome),
      bankAccountNumber: null, // full number is never returned by the backend
      bankIfscCode: profile?.bankIfscCode,
      bankAccountHolderName: profile?.bankAccountHolderName,
      currentMonthlyEmi: parse(profile?.currentMonthlyEmi),
      creditCardCount: profile?.creditCardCount,
      creditCardOutstanding: parse(profile?.creditCardOutstanding),
      existingLoansOutstanding: parse(profile?.existingLoansOutstanding),
      nomineeName: profile?.nomineeName,
      nomineeRelationship: profile?.nomineeRelationship,
      nomineePhone: profile?.nomineePhone,
      reference1Name: profile?.reference1Name,
      reference1Phone: profile?.reference1Phone,
      reference1Relationship: profile?.reference1Relationship,
      reference2Name: profile?.reference2Name,
      reference2Phone: profile?.reference2Phone,
      reference2Relationship: profile?.reference2Relationship,
    );
  }
}

/// Drives the multi-step loan application wizard. Kept as a single
/// controller/state object (rather than one route per step) so wizard
/// state survives step transitions without extra plumbing. The step
/// *sequence* is fixed per category at construction (see
/// `stepsForCategory`); navigation just walks `state.steps`.
class LoanApplicationFlowController extends StateNotifier<LoanApplicationFormState> {
  LoanApplicationFlowController(
    this._loanRepository,
    this._profileRepository, {
    required String? categoryId,
    required CustomerProfile? initialProfile,
  }) : super(LoanApplicationFormState.fromProfile(
          categoryId: categoryId,
          profile: initialProfile,
        ));

  final LoanApplicationRepository _loanRepository;
  final CustomerProfileRepository _profileRepository;

  void nextStep() {
    if (state.isLastStep) return;
    state = state.copyWith(stepIndex: state.stepIndex + 1, clearError: true);
  }

  void previousStep() {
    if (state.isFirstStep) return;
    state = state.copyWith(stepIndex: state.stepIndex - 1, clearError: true);
  }

  void updatePersonal({String? dateOfBirth, String? gender, String? maritalStatus,
      String? fatherName, String? motherName}) {
    state = state.copyWith(
      dateOfBirth: dateOfBirth,
      gender: gender,
      maritalStatus: maritalStatus,
      fatherName: fatherName,
      motherName: motherName,
      clearError: true,
    );
  }

  void updateAddress({String? addressLine1, String? city, String? state, String? postalCode,
      String? residenceType, int? yearsAtCurrentAddress, String? permanentAddress}) {
    this.state = this.state.copyWith(
          addressLine1: addressLine1,
          city: city,
          state: state,
          postalCode: postalCode,
          residenceType: residenceType,
          yearsAtCurrentAddress: yearsAtCurrentAddress,
          permanentAddress: permanentAddress,
          clearError: true,
        );
  }

  void updateEmployment({String? employmentStatus, String? companyName, String? designation,
      String? joiningDate, String? officeAddress, String? officePhone}) {
    state = state.copyWith(
      employmentStatus: employmentStatus,
      companyName: companyName,
      designation: designation,
      joiningDate: joiningDate,
      officeAddress: officeAddress,
      officePhone: officePhone,
      clearError: true,
    );
  }

  void updateIncome({double? monthlyIncome, double? additionalIncome, String? bankAccountNumber,
      String? bankIfscCode, String? bankAccountHolderName}) {
    state = state.copyWith(
      monthlyIncome: monthlyIncome,
      additionalIncome: additionalIncome,
      bankAccountNumber: bankAccountNumber,
      bankIfscCode: bankIfscCode,
      bankAccountHolderName: bankAccountHolderName,
      clearError: true,
    );
  }

  void updateExistingLoans({double? currentMonthlyEmi, int? creditCardCount,
      double? creditCardOutstanding, double? existingLoansOutstanding}) {
    state = state.copyWith(
      currentMonthlyEmi: currentMonthlyEmi,
      creditCardCount: creditCardCount,
      creditCardOutstanding: creditCardOutstanding,
      existingLoansOutstanding: existingLoansOutstanding,
      clearError: true,
    );
  }

  void setAmount(double amount) => state = state.copyWith(amount: amount, clearError: true);
  void setTerm(int termMonths) => state = state.copyWith(termMonths: termMonths, clearError: true);
  void setPurpose(String purpose) => state = state.copyWith(purpose: purpose);

  void updateNominee({String? nomineeName, String? nomineeRelationship, String? nomineePhone}) {
    state = state.copyWith(
      nomineeName: nomineeName,
      nomineeRelationship: nomineeRelationship,
      nomineePhone: nomineePhone,
      clearError: true,
    );
  }

  void updateReferences({
    String? reference1Name,
    String? reference1Phone,
    String? reference1Relationship,
    String? reference2Name,
    String? reference2Phone,
    String? reference2Relationship,
  }) {
    state = state.copyWith(
      reference1Name: reference1Name,
      reference1Phone: reference1Phone,
      reference1Relationship: reference1Relationship,
      reference2Name: reference2Name,
      reference2Phone: reference2Phone,
      reference2Relationship: reference2Relationship,
      clearError: true,
    );
  }

  /// Saves every step's data to the profile (one consolidated PATCH,
  /// existing endpoint), then submits the loan application itself
  /// (existing, unchanged endpoint). Returns the new application's id
  /// on success, or null on failure (`state.errorMessage` set for the
  /// UI).
  Future<String?> submit() async {
    state = state.copyWith(isSubmitting: true, clearError: true);

    final profileResult = await _profileRepository.updateMyProfile({
      if (state.dateOfBirth != null) 'dateOfBirth': state.dateOfBirth,
      if (state.gender != null) 'gender': state.gender,
      if (state.maritalStatus != null) 'maritalStatus': state.maritalStatus,
      if (state.fatherName != null) 'fatherName': state.fatherName,
      if (state.motherName != null) 'motherName': state.motherName,
      if (state.addressLine1 != null) 'addressLine1': state.addressLine1,
      if (state.city != null) 'city': state.city,
      if (state.state != null) 'state': state.state,
      if (state.postalCode != null) 'postalCode': state.postalCode,
      if (state.residenceType != null) 'residenceType': state.residenceType,
      if (state.yearsAtCurrentAddress != null)
        'yearsAtCurrentAddress': state.yearsAtCurrentAddress,
      if (state.permanentAddress != null) 'permanentAddress': state.permanentAddress,
      if (state.employmentStatus != null) 'employmentStatus': state.employmentStatus,
      if (state.companyName != null) 'companyName': state.companyName,
      if (state.designation != null) 'designation': state.designation,
      if (state.joiningDate != null) 'joiningDate': state.joiningDate,
      if (state.officeAddress != null) 'officeAddress': state.officeAddress,
      if (state.officePhone != null) 'officePhone': state.officePhone,
      if (state.monthlyIncome != null) 'monthlyIncome': state.monthlyIncome,
      if (state.additionalIncome != null) 'additionalIncome': state.additionalIncome,
      if (state.bankAccountNumber != null) 'bankAccountNumber': state.bankAccountNumber,
      if (state.bankIfscCode != null) 'bankIfscCode': state.bankIfscCode,
      if (state.bankAccountHolderName != null)
        'bankAccountHolderName': state.bankAccountHolderName,
      if (state.currentMonthlyEmi != null) 'currentMonthlyEmi': state.currentMonthlyEmi,
      if (state.creditCardCount != null) 'creditCardCount': state.creditCardCount,
      if (state.creditCardOutstanding != null)
        'creditCardOutstanding': state.creditCardOutstanding,
      if (state.existingLoansOutstanding != null)
        'existingLoansOutstanding': state.existingLoansOutstanding,
      if (state.nomineeName != null) 'nomineeName': state.nomineeName,
      if (state.nomineeRelationship != null) 'nomineeRelationship': state.nomineeRelationship,
      if (state.nomineePhone != null) 'nomineePhone': state.nomineePhone,
      if (state.reference1Name != null) 'reference1Name': state.reference1Name,
      if (state.reference1Phone != null) 'reference1Phone': state.reference1Phone,
      if (state.reference1Relationship != null)
        'reference1Relationship': state.reference1Relationship,
      if (state.reference2Name != null) 'reference2Name': state.reference2Name,
      if (state.reference2Phone != null) 'reference2Phone': state.reference2Phone,
      if (state.reference2Relationship != null)
        'reference2Relationship': state.reference2Relationship,
    });

    final profileFailed = profileResult.when(success: (_) => false, failure: (_) => true);
    if (profileFailed) {
      state = state.copyWith(
        isSubmitting: false,
        errorMessage: profileResult.when(
          success: (_) => null,
          failure: (error) => friendlyMessage(error),
        ),
      );
      return null;
    }

    final result = await _loanRepository.submit(
      requestedAmount: state.amount!,
      requestedTermMonths: state.termMonths!,
      purpose: state.purpose,
      categoryId: state.categoryId,
    );

    return result.when(
      success: (application) {
        state = state.copyWith(isSubmitting: false);
        return application.id;
      },
      failure: (error) {
        state = state.copyWith(isSubmitting: false, errorMessage: friendlyMessage(error));
        return null;
      },
    );
  }
}

final loanApplicationFlowControllerProvider = StateNotifierProvider.autoDispose
    .family<LoanApplicationFlowController, LoanApplicationFormState, String?>((ref, categoryId) {
  final overview = ref.watch(profileOverviewProvider).valueOrNull;
  return LoanApplicationFlowController(
    ref.read(loanApplicationRepositoryProvider),
    ref.read(customerProfileRepositoryProvider),
    categoryId: categoryId,
    initialProfile: overview?.customerProfile,
  );
});
