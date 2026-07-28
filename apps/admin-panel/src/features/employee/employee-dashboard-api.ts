import type { EmployeeDashboardSummary } from '@loan-manager/shared-types';

import { apiClient } from '../../lib/api-client';

export async function fetchMyDashboardSummary(): Promise<EmployeeDashboardSummary> {
  const { data } = await apiClient.get<EmployeeDashboardSummary>('/v1/employee-dashboard/summary');
  return data;
}
