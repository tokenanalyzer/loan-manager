import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models/customer_summary.dart';
import '../../core/riverpod/providers.dart';

/// Loads every customer for the CRM list.
class CustomersController extends AsyncNotifier<List<CustomerSummary>> {
  @override
  Future<List<CustomerSummary>> build() async {
    final repository = ref.read(customerRepositoryProvider);
    final result = await repository.listCustomers();
    return result.when(success: (data) => data, failure: (error) => throw error);
  }

  Future<void> refresh() async {
    state = const AsyncLoading<List<CustomerSummary>>().copyWithPrevious(state);
    state = await AsyncValue.guard(build);
  }
}

final customersControllerProvider =
    AsyncNotifierProvider<CustomersController, List<CustomerSummary>>(
  CustomersController.new,
);
