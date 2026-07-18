import type {
  EmployeeWorkload,
  LeadAssignmentHistoryEntry,
  LeadSummary,
} from '@loan-manager/shared-types';

import { apiClient } from '../../lib/api-client';

/**
 * Lead Assignment API client — thin wrappers over the shared
 * `apiClient` (bearer token attached automatically, see
 * `lib/api-client.ts`) around `LoanApplicationsController` and
 * `LeadAssignmentController` on the backend.
 */

export async function fetchUnassignedLeads(): Promise<LeadSummary[]> {
  const { data } = await apiClient.get<LeadSummary[]>('/v1/lead-assignment/unassigned-leads');
  return data;
}

/** Every lead, assigned or not — admin-only; used to build the Assigned Leads view. */
export async function fetchAllLeads(): Promise<LeadSummary[]> {
  const { data } = await apiClient.get<LeadSummary[]>('/v1/loan-applications');
  return data;
}

export async function fetchEmployeesWithWorkload(): Promise<EmployeeWorkload[]> {
  const { data } = await apiClient.get<EmployeeWorkload[]>('/v1/lead-assignment/employees');
  return data;
}

export async function assignLead(applicationId: string, employeeId: string): Promise<LeadSummary> {
  const { data } = await apiClient.patch<LeadSummary>(
    `/v1/lead-assignment/leads/${applicationId}/assign`,
    { employeeId },
  );
  return data;
}

export async function transferSelectedLeads(
  applicationIds: string[],
  employeeId: string,
): Promise<{ transferred: number }> {
  const { data } = await apiClient.patch<{ transferred: number }>(
    '/v1/lead-assignment/leads/transfer',
    { applicationIds, employeeId },
  );
  return data;
}

export async function transferAllActiveLeads(
  fromEmployeeId: string,
  toEmployeeId: string,
): Promise<{ transferred: number }> {
  const { data } = await apiClient.patch<{ transferred: number }>(
    `/v1/lead-assignment/employees/${fromEmployeeId}/transfer-all`,
    { toEmployeeId },
  );
  return data;
}

export async function fetchAssignmentHistory(
  applicationId: string,
): Promise<LeadAssignmentHistoryEntry[]> {
  const { data } = await apiClient.get<LeadAssignmentHistoryEntry[]>(
    `/v1/lead-assignment/leads/${applicationId}/history`,
  );
  return data;
}
