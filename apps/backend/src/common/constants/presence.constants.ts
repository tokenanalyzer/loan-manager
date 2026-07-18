/**
 * How recently `UserEntity.lastActiveAt` must have been stamped (see
 * `AuthService.syncFromFirebaseToken`) for a user to be considered
 * Online. Shared by the Lead Assignment employee picker and the
 * Work Status / Break Management dashboard.
 */
export const PRESENCE_ONLINE_THRESHOLD_MINUTES = 5;
