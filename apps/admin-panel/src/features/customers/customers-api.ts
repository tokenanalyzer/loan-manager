import type { CustomerSummary } from '@loan-manager/shared-types';

import { apiClient } from '../../lib/api-client';

/** Customers API client — thin wrapper over the shared `apiClient` around `CustomersController` (admin/employee-only list). */
export async function fetchCustomers(): Promise<CustomerSummary[]> {
  const { data } = await apiClient.get<CustomerSummary[]>('/v1/customers');
  return data;
}
