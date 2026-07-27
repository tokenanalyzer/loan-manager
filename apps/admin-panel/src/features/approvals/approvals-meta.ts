import type { ApprovalAction } from '@loan-manager/shared-types';

/** Human-readable label for an approval action — shared by the Team screen's "pending" badge and the Approvals queue. */
const ACTION_LABELS: Record<ApprovalAction, string> = {
  staff_disable: 'Disable this account',
  staff_archive: 'Archive this account',
  staff_restore: 'Restore this account',
};

export function describeAction(action: string): string {
  return ACTION_LABELS[action as ApprovalAction] ?? action.replace(/_/g, ' ');
}
