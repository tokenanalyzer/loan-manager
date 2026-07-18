import type { EmployeeStatusSummary, MyWorkStatus, WorkStatus } from '@loan-manager/shared-types';

import { apiClient } from '../../lib/api-client';

/** Employee self-service. */

export async function fetchMyWorkStatus(): Promise<MyWorkStatus> {
  const { data } = await apiClient.get<MyWorkStatus>('/v1/work-status/me');
  return data;
}

export async function startBreak(breakType: WorkStatus): Promise<MyWorkStatus> {
  const { data } = await apiClient.post<MyWorkStatus>('/v1/work-status/break/start', {
    breakType,
  });
  return data;
}

export async function endMyBreak(): Promise<MyWorkStatus> {
  const { data } = await apiClient.post<MyWorkStatus>('/v1/work-status/break/end');
  return data;
}

export async function setMyStatus(status: WorkStatus): Promise<MyWorkStatus> {
  const { data } = await apiClient.patch<MyWorkStatus>('/v1/work-status/status', { status });
  return data;
}

/** Admin Override. */

export async function fetchEmployeeStatuses(): Promise<EmployeeStatusSummary[]> {
  const { data } = await apiClient.get<EmployeeStatusSummary[]>('/v1/work-status/employees');
  return data;
}

export async function adminEndBreak(
  employeeId: string,
  forceResume = true,
): Promise<EmployeeStatusSummary> {
  const { data } = await apiClient.patch<EmployeeStatusSummary>(
    `/v1/work-status/employees/${employeeId}/end-break`,
    { forceResume },
  );
  return data;
}

export async function forceLogoutEmployee(employeeId: string): Promise<void> {
  await apiClient.patch(`/v1/work-status/employees/${employeeId}/force-logout`);
}

export async function disableEmployee(employeeId: string): Promise<void> {
  await apiClient.patch(`/v1/work-status/employees/${employeeId}/disable`);
}
