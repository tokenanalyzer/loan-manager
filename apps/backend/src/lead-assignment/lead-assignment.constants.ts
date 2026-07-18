/**
 * How recently `UserEntity.lastActiveAt` must have been stamped (see
 * `AuthService.syncFromFirebaseToken`) for an employee to be shown as
 * Online in the assignment picker.
 */
export const PRESENCE_ONLINE_THRESHOLD_MINUTES = 5;
