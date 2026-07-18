import type { WorkStatus } from '@loan-manager/shared-types';

export const STATUS_LABELS: Record<WorkStatus, string> = {
  online: 'Online',
  busy: 'Busy',
  tea_break: 'Tea Break',
  lunch_break: 'Lunch Break',
  meeting: 'Meeting',
  training: 'Training',
  away: 'Away',
  offline: 'Offline',
};

export const STATUS_COLORS: Record<WorkStatus, string> = {
  online: 'var(--color-success)',
  busy: 'var(--color-warning)',
  tea_break: 'var(--color-accent-gold)',
  lunch_break: 'var(--color-accent-gold)',
  meeting: 'var(--color-primary)',
  training: 'var(--color-primary)',
  away: 'var(--color-text-tertiary)',
  offline: 'var(--color-text-tertiary)',
};

export function formatElapsed(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}
