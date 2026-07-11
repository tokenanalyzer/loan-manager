import 'package:shared_flutter/shared_flutter.dart';

import '../models/loan_application.dart';

/// Repository for the Customer App's own loan applications.
///
/// Extends the shared `BaseRepository` (established in Phase 2) —
/// this is the first concrete repository built on top of it. No
/// business logic (validation, status transitions) lives here; the
/// backend enforces all of that.
class LoanApplicationRepository extends BaseRepository {
  LoanApplicationRepository(super.apiClient);

  Future<ApiResult<LoanApplication>> submit({
    required double requestedAmount,
    required int requestedTermMonths,
    String? purpose,
  }) {
    return post<LoanApplication>(
      '/v1/loan-applications',
      body: {
        'requestedAmount': requestedAmount,
        'requestedTermMonths': requestedTermMonths,
        if (purpose != null && purpose.isNotEmpty) 'purpose': purpose,
      },
      mapper: (data) => LoanApplication.fromJson(data as Map<String, dynamic>),
    );
  }

  Future<ApiResult<List<LoanApplication>>> getMyApplications() {
    return get<List<LoanApplication>>(
      '/v1/loan-applications',
      mapper: (data) => (data as List<dynamic>)
          .map((item) => LoanApplication.fromJson(item as Map<String, dynamic>))
          .toList(),
    );
  }

  Future<ApiResult<LoanApplication>> getApplication(String id) {
    return get<LoanApplication>(
      '/v1/loan-applications/$id',
      mapper: (data) => LoanApplication.fromJson(data as Map<String, dynamic>),
    );
  }
}
