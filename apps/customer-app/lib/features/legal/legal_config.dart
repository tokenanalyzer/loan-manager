/// Centralized, configurable facts referenced by every Legal screen.
///
/// Company name, contact details, and effective date live here once —
/// changing them means editing this file, not hunting through six
/// separate policy pages for hardcoded strings. The policy *body* text
/// stays static Dart content (same pattern as `faq_screen.dart` /
/// `help_center_screen.dart` — no backend content-management system
/// exists or is needed for this yet), but every company-specific fact
/// it needs is pulled from here rather than typed inline.
///
/// IMPORTANT: several values below (registered office address, company
/// registration/CIN number, grievance officer) are placeholders, not
/// real legal facts — this repository has no source of truth for them.
/// Legal/compliance must review and finalize every field here, and the
/// policy text itself, before any production release.
class LegalConfig {
  const LegalConfig._();

  static const String companyLegalName =
      'Rectangle Consultancy and Services Pvt. Ltd.';
  static const String platformName = 'Loan Manager';
  static const String supportEmail = 'support@loanmanagerapp.com';
  static const String supportPhone = '+91-00000-00000';
  static const String registeredOffice =
      '[Registered office address — to be finalized by Legal/Compliance]';
  static const String grievanceOfficerContact =
      '[Grievance officer name and contact — to be finalized by Legal/Compliance]';

  /// Manually updated whenever the policy text changes materially —
  /// not derived from a build timestamp, so a code deploy with no
  /// policy changes doesn't silently re-date every document.
  static const String effectiveDate = 'July 20, 2026';

  /// The single authoritative statement of what this platform is (and
  /// is not) — reused verbatim by the Disclaimer and referenced by
  /// every other legal document so the facilitator/DSA framing never
  /// drifts between pages.
  static const String facilitationStatement =
      '$companyLegalName operates $platformName as a loan facilitation / '
      'DSA (Direct Selling Agent) platform. $companyLegalName is not a '
      'lender, a bank, or a non-banking financial company (NBFC), and does '
      'not itself sanction, underwrite, or disburse loans. We connect you '
      'with partner Banks and NBFCs, who make the actual lending decision, '
      'set the loan terms, and disburse funds.';
}
