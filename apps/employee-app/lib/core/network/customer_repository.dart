import 'package:shared_flutter/shared_flutter.dart';

import '../models/customer_profile.dart';
import '../models/customer_summary.dart';

/// Repository for the Employee App's CRM customer lookup.
///
/// Read-only — there is deliberately no customer-editing capability
/// for employees in Phase 5 (customers manage their own profile via
/// the Customer App).
class CustomerRepository extends BaseRepository {
  CustomerRepository(super.apiClient);

  Future<ApiResult<List<CustomerSummary>>> listCustomers() {
    return get<List<CustomerSummary>>(
      '/v1/customers',
      mapper: (data) => (data as List<dynamic>)
          .map((item) => CustomerSummary.fromJson(item as Map<String, dynamic>))
          .toList(),
    );
  }

  Future<ApiResult<CustomerSummary>> getCustomer(String id) {
    return get<CustomerSummary>(
      '/v1/customers/$id',
      mapper: (data) => CustomerSummary.fromJson(data as Map<String, dynamic>),
    );
  }

  Future<ApiResult<CustomerProfile?>> getCustomerProfile(String id) {
    return get<CustomerProfile?>(
      '/v1/customers/$id/profile',
      mapper: (data) =>
          data == null ? null : CustomerProfile.fromJson(data as Map<String, dynamic>),
    );
  }
}
