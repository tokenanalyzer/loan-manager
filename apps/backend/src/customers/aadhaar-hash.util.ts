import { createHash } from 'crypto';

/**
 * Salted SHA-256 hash of a full Aadhaar number — used only to detect
 * duplicate Aadhaar numbers across customers later, never to recover
 * the original number. The raw number is never persisted (see
 * `CustomerProfileEntity.aadhaarHash`'s doc comment).
 *
 * The salt below is a fixed application-level pepper, not a per-user
 * secret — adequate for this self-attested/no-live-verification flow,
 * but should move to a KMS-managed secret before this hash is used for
 * anything higher-stakes (e.g. a real UIDAI verification handshake).
 */
const AADHAAR_HASH_PEPPER = 'loan-manager-aadhaar-pepper-v1';

export function hashAadhaar(aadhaarNumber: string): string {
  return createHash('sha256').update(`${AADHAAR_HASH_PEPPER}:${aadhaarNumber}`).digest('hex');
}
