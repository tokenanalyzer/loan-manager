/** Employee CRM — mirrors the backend's `FollowUpResponseDto`/`FollowUpStatus`. */
export type FollowUpStatus = 'pending' | 'done' | 'cancelled';

export interface FollowUp {
  id: string;
  loanApplicationId: string;
  caseNumber: string;
  applicantName: string | null;
  note: string;
  dueAt: string;
  status: FollowUpStatus;
  completedAt: string | null;
  createdAt: string;
}

export interface CreateFollowUpPayload {
  loanApplicationId: string;
  note: string;
  dueAt: string;
}

export interface UpdateFollowUpPayload {
  note?: string;
  dueAt?: string;
}
