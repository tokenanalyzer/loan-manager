/**
 * @loan-manager/shared-types
 *
 * Shared TypeScript types/interfaces used across the backend and
 * admin panel. Phase 2 adds generic API response/pagination shapes
 * used by the shared API client architecture; domain-specific types
 * (loans, users, documents, etc.) will be added once schema/API work
 * begins in a later phase.
 */
export * from './api-response';
export * from './auth';
export * from './documents';
export * from './lead-assignment';
export * from './notifications';
export * from './work-status';
