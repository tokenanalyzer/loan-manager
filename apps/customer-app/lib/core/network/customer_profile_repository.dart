import 'package:shared_flutter/shared_flutter.dart';

import '../models/customer_profile.dart';

/// Repository for the Customer App's own profile — the CRM data
/// customers self-report (address, income, etc.) plus, as of Phase 6,
/// privacy/consent settings and account-deletion requests.
class CustomerProfileRepository extends BaseRepository {
  CustomerProfileRepository(super.apiClient);

  Future<ApiResult<CustomerProfile?>> getMyProfile() {
    return get<CustomerProfile?>(
      '/v1/customers/me',
      mapper: (data) => data == null
          ? null
          : CustomerProfile.fromJson(data as Map<String, dynamic>),
    );
  }

  Future<ApiResult<CustomerProfile>> updateMyProfile(
      Map<String, dynamic> fields) {
    return _patch<CustomerProfile>(
      '/v1/customers/me',
      body: fields,
      mapper: (data) => CustomerProfile.fromJson(data as Map<String, dynamic>),
    );
  }

  /// Records an account-deletion request (does not delete anything
  /// itself — see the backend's CustomersService for why).
  Future<ApiResult<DateTime>> requestAccountDeletion() {
    return apiClient.request<DateTime>(
      (dio) => dio.post('/v1/customers/me/deletion-request'),
      mapper: (data) => DateTime.parse(
          (data as Map<String, dynamic>)['deletionRequestedAt'] as String),
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
