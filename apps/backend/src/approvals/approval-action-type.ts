/**
 * The set of actions that can be routed through the maker-checker
 * workflow. Adding a brand-new gated action later (Role Change, Delete
 * User, Permission Change, ...) is a new member here plus an executor
 * registration (see `ApprovalActionExecutorRegistry`) — never a schema
 * migration, since `ApprovalRequestEntity.action` stores this as plain
 * text, not a Postgres enum.
 */
export enum ApprovalActionType {
  STAFF_DISABLE = 'staff_disable',
  STAFF_ARCHIVE = 'staff_archive',
  STAFF_RESTORE = 'staff_restore',
}
