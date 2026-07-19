/**
 * Type badge label/color for a notification's `relatedEntityType`.
 * Known values are set by the backend's `NotificationsService.createForUser`
 * callers (`loan_application`, `customer_profile`, `employee_break`) — an
 * unrecognized or absent value falls back to a generic "Update" badge
 * rather than failing, since the field is a plain `string | null` on the
 * wire, not a closed enum.
 */
export const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  loan_application: 'Lead',
  customer_profile: 'KYC',
  employee_break: 'Break',
};

export const NOTIFICATION_TYPE_COLORS: Record<string, string> = {
  loan_application: 'var(--color-primary)',
  customer_profile: 'var(--color-accent-gold)',
  employee_break: 'var(--color-warning)',
};

export function notificationTypeLabel(relatedEntityType: string | null): string {
  if (!relatedEntityType) return 'Update';
  return NOTIFICATION_TYPE_LABELS[relatedEntityType] ?? 'Update';
}

export function notificationTypeColor(relatedEntityType: string | null): string {
  if (!relatedEntityType) return 'var(--color-text-tertiary)';
  return NOTIFICATION_TYPE_COLORS[relatedEntityType] ?? 'var(--color-text-tertiary)';
}
