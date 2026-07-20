# ADR 0001: Multi-Slot Required Document Blocking Rule

**Status:** Accepted
**Date:** 2026-07-20
**Related:** Sprint 1, Item 4 (`DocumentsService.getBlockingDocumentsForApproval`, `LoanApplicationsService.review`)

## Context

The approval validation gate (`LoanApplicationsService.review`, `decision: 'approve'`) must reject approval unless every *required* document type for the application's category is `verified`. Some document types are multi-slot — e.g. Salary Slip allows up to 3 uploads (`document_types.max_uploads = 3`), but the catalog's `is_required` flag is a single boolean on the *type*, not on individual slots. The catalog has no concept of "slot 1 is mandatory, slots 2–3 are optional extras."

This left an implementation-time judgment call with no explicit product decision behind it: if a required, multi-slot type has *any* uploaded document that isn't yet `verified` — including an optional extra slot nobody was required to fill — should that block approval?

## Decision

**Yes.** For a required document type, if *any* uploaded document of that type is not `verified` (i.e. `pending`, `rejected`, or `reupload_requested`), approval is blocked — regardless of which slot it occupies or whether that slot was strictly mandatory to satisfy the requirement.

Concretely, in `DocumentsService.getBlockingDocumentsForApproval`:
- No document uploaded for a required type → blocking, reason `missing`.
- At least one uploaded document exists, but any of them (any slot) is not `verified` → blocking, reason mirrors that document's actual status.
- A required type only clears the gate when every document currently on file for it is `verified`.

## Rationale

This is the conservative, fintech-appropriate default: a staff member who requests a re-upload or leaves a document unverified almost always intends that to block the process, even if it lands in what happens to be an "extra" slot. Silently ignoring an unverified document because it's not in the first slot would be a surprising, hard-to-explain gap in a compliance-sensitive approval path. "When in doubt, block" was chosen over "when in doubt, ignore."

## Consequences

- **Known trade-off:** a customer who uploads an optional third salary slip that never gets reviewed will block their own approval, even though only one salary slip was actually required. This is a real, if narrow, false-positive case.
- Single-slot required types (`max_uploads = 1`) are entirely unaffected — this includes the Photo Verification catalog rows (`passport_photo`, `selfie`) seeded in Sprint 1, Item 6.
- No schema change was made to express "which slot(s) are mandatory" — the catalog's `is_required`/`max_uploads` pair remains type-level only.

## Alternatives considered

1. **Only check slot 1** (or the first N slots matching some implicit "required count"). Rejected: the catalog has no data expressing a required count distinct from `max_uploads`, so this would need a new column and a product-defined default (e.g. "required count = 1 unless specified") — a larger schema change for a narrow edge case.
2. **Ignore extra slots' verification state entirely, only require at least one verified document per type.** Rejected: this would let a customer bypass a staff-requested re-upload by leaving the original unresolved and simply not touching it, as long as *some* copy of that type was once verified — weaker than the current behavior, not stronger.

## Follow-up

If the false-positive case in Consequences proves disruptive in practice, the fix is to add a `required_slot_count` (or equivalent) column to `document_types`, defaulting to 1, and check only up to that count. Not implemented now — flagged as a candidate for a future pass once real usage data shows whether this edge case matters.
