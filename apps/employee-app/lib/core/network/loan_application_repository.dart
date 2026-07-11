import 'package:shared_flutter/shared_flutter.dart';

import '../models/loan_application.dart';

/// Repository for the Employee App's loan-application review workflow.
///
/// Extends the shared `BaseRepository` established in Phase 2. All
/// business rules (who can review, what a decision requires) are
/// enforced by the backend — this repository only calls the endpoints.
class LoanApplicationRepository extends BaseRepository {
  LoanApplicationRepository(super.apiClient);

  /// Employees see every application (not just their own, since they
  /// don't submit any) — the backend scopes this by the caller's role.
  Future<ApiResult<List<LoanApplication>>> getAllApplications() {
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

  Future<ApiResult<LoanApplication>> approve({
    required String id,
    required double interestRate,
  }) {
    return _patch<LoanApplication>(
      '/v1/loan-applications/$id/review',
      body: {'decision': 'approve', 'interestRate': interestRate},
      mapper: (data) => LoanApplication.fromJson(data as Map<String, dynamic>),
    );
  }

  Future<ApiResult<LoanApplication>> reject(String id) {
    return _patch<LoanApplication>(
      '/v1/loan-applications/$id/review',
      body: {'decision': 'reject'},
      mapper: (data) => LoanApplication.fromJson(data as Map<String, dynamic>),
    );
  }

  Future<ApiResult<T>> _patch<T>(
    String path, {
    required Object body,
    required T Function(dynamic data) mapper,
  }) {
    return apiClient.request<T>(
      (dio) => dio.patch(path, data: body),
      mapper: mapper,
    );
  }
}
