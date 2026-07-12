import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/loan_application_repository.dart';
import '../../core/riverpod/providers.dart';

enum LoanApplicationStep { amountAndTerm, purpose, review }

class LoanApplicationFormState {
  const LoanApplicationFormState({
    this.step = LoanApplicationStep.amountAndTerm,
    this.categoryId,
    this.amount,
    this.termMonths,
    this.purpose,
    this.isSubmitting = false,
    this.errorMessage,
  });

  final LoanApplicationStep step;
  final String? categoryId;
  final double? amount;
  final int? termMonths;
  final String? purpose;
  final bool isSubmitting;
  final String? errorMessage;

  bool get canProceedFromAmountStep =>
      amount != null && amount! > 0 && termMonths != null && termMonths! > 0;

  LoanApplicationFormState copyWith({
    LoanApplicationStep? step,
    double? amount,
    int? termMonths,
    String? purpose,
    bool? isSubmitting,
    String? errorMessage,
    bool clearError = false,
  }) {
    return LoanApplicationFormState(
      step: step ?? this.step,
      categoryId: categoryId,
      amount: amount ?? this.amount,
      termMonths: termMonths ?? this.termMonths,
      purpose: purpose ?? this.purpose,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }
}

/// Drives the multi-step loan application wizard. Kept as a single
/// controller/state object (rather than one route per step) so
/// wizard state survives step transitions without extra plumbing.
class LoanApplicationFlowController
    extends StateNotifier<LoanApplicationFormState> {
  LoanApplicationFlowController(this._repository, {String? categoryId})
      : super(LoanApplicationFormState(categoryId: categoryId));

  final LoanApplicationRepository _repository;

  void setAmount(double amount) =>
      state = state.copyWith(amount: amount, clearError: true);

  void setTerm(int termMonths) =>
      state = state.copyWith(termMonths: termMonths, clearError: true);

  void setPurpose(String purpose) => state = state.copyWith(purpose: purpose);

  void goToStep(LoanApplicationStep step) =>
      state = state.copyWith(step: step, clearError: true);

  void nextStep() {
    final next = switch (state.step) {
      LoanApplicationStep.amountAndTerm => LoanApplicationStep.purpose,
      LoanApplicationStep.purpose => LoanApplicationStep.review,
      LoanApplicationStep.review => LoanApplicationStep.review,
    };
    state = state.copyWith(step: next, clearError: true);
  }

  void previousStep() {
    final previous = switch (state.step) {
      LoanApplicationStep.amountAndTerm => LoanApplicationStep.amountAndTerm,
      LoanApplicationStep.purpose => LoanApplicationStep.amountAndTerm,
      LoanApplicationStep.review => LoanApplicationStep.purpose,
    };
    state = state.copyWith(step: previous, clearError: true);
  }

  /// Returns the new application's id on success, or null on failure
  /// (with `state.errorMessage` set for the UI to display).
  Future<String?> submit() async {
    state = state.copyWith(isSubmitting: true, clearError: true);

    final result = await _repository.submit(
      requestedAmount: state.amount!,
      requestedTermMonths: state.termMonths!,
      purpose: state.purpose,
    );

    return result.when(
      success: (application) {
        state = state.copyWith(isSubmitting: false);
        return application.id;
      },
      failure: (error) {
        state =
            state.copyWith(isSubmitting: false, errorMessage: error.message);
        return null;
      },
    );
  }
}

final loanApplicationFlowControllerProvider = StateNotifierProvider.autoDispose
    .family<LoanApplicationFlowController, LoanApplicationFormState, String?>(
        (ref, categoryId) {
  return LoanApplicationFlowController(
    ref.read(loanApplicationRepositoryProvider),
    categoryId: categoryId,
  );
});
