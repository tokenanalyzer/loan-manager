import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models/loan_application.dart';
import '../../core/riverpod/providers.dart';

/// Loads every loan application for staff review.
class ApplicationsController extends AsyncNotifier<List<LoanApplication>> {
  @override
  Future<List<LoanApplication>> build() async {
    final repository = ref.read(loanApplicationRepositoryProvider);
    final result = await repository.getAllApplications();
    return result.when(success: (data) => data, failure: (error) => throw error);
  }

  Future<void> refresh() async {
    state = const AsyncLoading<List<LoanApplication>>().copyWithPrevious(state);
    state = await AsyncValue.guard(build);
  }
}

final applicationsControllerProvider =
    AsyncNotifierProvider<ApplicationsController, List<LoanApplication>>(
  ApplicationsController.new,
);
