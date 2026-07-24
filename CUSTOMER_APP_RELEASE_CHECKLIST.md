# Customer App — Release Checklist

Status as of this production-freeze sprint. Scope was the Customer App only — no work was done on the DSA App, Employee App, Bank Portal, or Super Admin Panel, per instruction.

## Completed Features

### Document Manager (this sprint)

- Upload sources: **Camera**, **Gallery**, and **Files** (new — `file_picker`, restricted to PDF/JPG/JPEG/PNG via `FileType.custom`).
- Client-side validation before every upload attempt: file extension allowlist and 10 MB size cap (mirrors the backend's `MAX_DOCUMENT_FILE_SIZE_BYTES`/`ALLOWED_DOCUMENT_MIME_TYPES`), with friendly inline error messages instead of a failed upload round-trip.
- In-app **PDF viewer** (new — `pdfx`, pinch-to-zoom, pdfium/FFI — no license key required) and in-app **image viewer** (new — `photo_view`, pinch-to-zoom). Nothing forces the user out of the app to view a document.
- Document preview now fetches bytes through the shared `ApiClient` (auth interceptor attaches the bearer token automatically) instead of a raw `Image.network` call managing its own Firebase token — fixes both images and PDFs with one authenticated code path.
- File size now displayed next to the file name on every uploaded slot (`Formatters.fileSize`, new).
- Upload/Replace/Delete/Preview/Progress/Status were already implemented pre-sprint and remain unchanged.
- Recent Documents on Home is now tappable straight into preview (previously dead rows).
- Document _types_ were already fully catalog-driven server-side (`GET /v1/documents`) before this sprint and already covered the full required list (Identity, Income incl. 3-slot Salary Slip, Employment, Balance Transfer, Home/Vehicle/Business/Gold loan-specific docs, 3-slot Other) — no backend changes were needed here.

### Application Wizard

- Loan Requirement step now validates the requested amount and term against the selected category's `minAmount`/`maxAmount`/`minTermMonths`/`maxTermMonths` client-side, with a friendly currency-formatted message, instead of only failing on submit.
- Review step now shows every field actually collected: mother's name, PIN code, permanent address, designation, joining date, office address/phone, additional income, masked bank account/IFSC/holder name, credit card count/outstanding, both references (name/phone/relationship), and a documents-uploaded summary. Previously several collected fields were silently missing from the review screen.
- Submit flow, regex validation (PAN/Aadhaar/PIN/phone/IFSC/bank account), and dynamic per-category steps were already solid pre-sprint — no mock/fake success path exists anywhere in the flow.

### Home

- Lending Partners section redesigned: no more fake disabled "Coming soon" bank tiles. It now renders one premium, intentional "More lending partners coming soon" card, backed by a real (if currently backend-less) `lendingPartnersProvider` → `LendingPartnerRepository` → `GET /v1/lending-partners`. The call fails soft to an empty list today; the same widget will render a horizontal partner list (logo, rate, offer) with **zero Flutter changes** the day a future sprint adds that endpoint.
- Everything else on Home (Credit Profile hero, eligibility, quick apply, recent activity, stat row) was already production-quality: theme tokens throughout, no `Colors.*` literals, real stagger animations, no overflow risk found.

### Profile

- Sign-out now requires an explicit confirmation dialog (previously a single accidental tap signed the user out with no recovery prompt).

### Audit findings with no code change needed

A full 3-pass audit (Documents, Application Wizard, Home/Profile/Loan-detail/Application-detail) found the app already well past "Flutter demo" quality: consistent design system (`AppCard`, `HeroCard`, `StatusBadge`, `SectionHeader`, `FadeSlideIn`), Indian currency/date formatting throughout, real submit/API flows with no fake delays or mocked success, no `print`/`debugPrint`/`TODO`/Lorem-ipsum/demo banners found anywhere in the app.

## Remaining Issues

- **On-device manual QA pass is pending** — no Android device was connected during this sprint (per instruction, this happens after implementation). Needs a real-device pass covering: Home, Loans, Documents, Profile, Notifications, every loan category's application flow, PDF upload, image upload, camera upload, gallery upload, file picker, preview, replace, delete, login persistence, navigation, bottom navigation, and responsiveness across screen sizes.
- `GET /v1/lending-partners` does not exist yet — intentionally deferred (no new backend module this sprint, per instruction). The Home dashboard correctly shows the "coming soon" state until that endpoint ships.
- Loan Details screen's category-level cost estimate is computed at the category's _minimum_ amount (clearly labeled "Estimated cost (at minimum amount)", not misleading, but not adjustable) — candidate for a future slider/amount input.

## Known Limitations

- ~~`apps/customer-app/env/production.json` has `"FIREBASE_ENABLED": false`~~ — **resolved 2026-07-24**: now `true` with real project id `loan-manager-india` and `API_BASE_URL` pointed at `https://api.loanmanagerapp.com/api`. See `docs/PRODUCTION_DEPLOYMENT_CHECKPOINT.md` §8.
- The Lending Partners section has no backend data source yet by design — see Remaining Issues.
- Automated test coverage is minimal (one smoke test verifying the app boots to Home). No widget/unit tests exist yet for the document upload flow, wizard validation, or review-step field mapping.
- The wizard's Review step shows the bank account number only if the user (re)typed it this session — the backend never returns a previously-stored full account number (by design, security), so a returning applicant who doesn't revisit the Income step won't see it in review even though it's on file.

## Security Checklist

- [x] Bearer token attached automatically to every request (including the new document-content byte fetch) via `ApiClient`'s interceptor — no ad-hoc token handling in UI code.
- [x] A genuine 401 anywhere signs the user out and redirects to login app-wide.
- [x] Document upload validated both client-side (extension allowlist + 10 MB cap, friendly errors) and server-side (MIME allowlist + Multer size limit) — defense in depth, not client-trust-only.
- [x] Bank account numbers masked in both the Profile view and the new wizard Review step.
- [x] Sign-out requires explicit confirmation.
- [ ] Firebase must be enabled and configured with a real project before production (see Known Limitations).
- [ ] Recommend a network security config / certificate-pinning review before Play Store submission (not assessed this sprint).
- [ ] Recommend confirming the Play Store Data Safety form matches actual data collected (PAN, Aadhaar, bank details, documents) — a compliance step, not a code check.

## Performance Checklist

- [x] Document preview fetches bytes once and reuses them for both image and PDF rendering — no duplicate network calls.
- [x] PDF rendering via `pdfx` (pdfium/FFI, native-speed) rather than a WebView-based viewer.
- [x] Feature-scoped Riverpod providers use `.autoDispose` throughout — no leaked state across navigation.
- [x] The Lending Partners section fails fast and soft (no retry storm, no blocked dashboard) when the endpoint doesn't exist.
- [ ] No explicit compression/caching strategy was assessed for large camera photos beyond `image_picker`'s default `imageQuality: 85` — acceptable for now, revisit if upload times become a complaint.
- [ ] Cold-start time was not profiled this sprint.

## Play Store Readiness

- [ ] Configure a real Firebase project and set `FIREBASE_ENABLED=true` in `env/production.json`.
- [ ] Review camera/photo-library permission strings against Play Store's permission-usage disclosure requirements (permissions themselves were already declared in a prior sprint).
- [ ] App icons, splash screen, and store-listing assets were not reviewed this sprint.
- [ ] Privacy policy and Data Safety form should reflect PAN/Aadhaar/bank/document data collection.
- [ ] Manual on-device QA pass required before submission (see Remaining Issues).
- [x] No debug/demo content, placeholder text, or test-only buttons found anywhere in the app (audited this sprint).
- [x] Document uploads correctly restricted to PDF/JPG/JPEG/PNG, enforced both client- and server-side.

## Production Readiness Score

**8 / 10** — The Customer App's UI, UX, document management, and application flow are production-quality after this sprint. The two remaining blockers are both external to the codebase: enabling/configuring real Firebase for production, and completing the on-device manual QA pass. No further Flutter feature work is identified as required for freeze.
