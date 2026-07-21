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
    String? categoryId,
    String? propertyType,
    String? propertyOwnership,
    String? propertyAddress,
    double? propertyValue,
    bool? hasExistingLoanOnProperty,
    double? existingLoanOutstandingAmount,
  }) {
    return post<LoanApplication>(
      '/v1/loan-applications',
      body: {
        'requestedAmount': requestedAmount,
        'requestedTermMonths': requestedTermMonths,
        if (purpose != null && purpose.isNotEmpty) 'purpose': purpose,
        if (categoryId != null) 'categoryId': categoryId,
        if (propertyType != null) 'propertyType': propertyType,
        if (propertyOwnership != null) 'propertyOwnership': propertyOwnership,
        if (propertyAddress != null) 'propertyAddress': propertyAddress,
        if (propertyValue != null) 'propertyValue': propertyValue,
        if (hasExistingLoanOnProperty != null)
          'hasExistingLoanOnProperty': hasExistingLoanOnProperty,
        if (existingLoanOutstandingAmount != null)
          'existingLoanOutstandingAmount': existingLoanOutstandingAmount,
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
