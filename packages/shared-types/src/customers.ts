import type { DocumentVerificationStatus } from './documents';
import type { LeadSummary } from './lead-assignment';

/**
 * Customer domain types — mirrors the backend's
 * `CustomerSummaryResponseDto` (`apps/backend/src/customers`). Identity
 * fields only, no full profile (address/income/etc — fetched
 * separately per-customer, not needed for a list/dashboard view).
 */
export interface CustomerSummary {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  isActive: boolean;
}

/** Mirrors the backend's `CustomerProfileResponseDto` — the full application-form profile, fetched per-customer (Customer 360, KYC review). */
export interface CustomerProfile {
  userId: string;
  dateOfBirth: string | null;
  panNumber: string | null;
  aadhaarLast4: string | null;
  kycStatus: string;
  kycRejectionReason: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  employmentStatus: string | null;
  monthlyIncome: string | null;
  marketingConsent: boolean;
  dataConsentAcceptedAt: string | null;
  bankAccountLast4: string | null;
  bankIfscCode: string | null;
  bankAccountHolderName: string | null;
  nomineeName: string | null;
  nomineeRelationship: string | null;
  nomineePhone: string | null;
  gender: string | null;
  maritalStatus: string | null;
  fatherName: string | null;
  motherName: string | null;
  residenceType: string | null;
  yearsAtCurrentAddress: number | null;
  permanentAddress: string | null;
  companyName: string | null;
  designation: string | null;
  joiningDate: string | null;
  officeAddress: string | null;
  officePhone: string | null;
  additionalIncome: string | null;
  currentMonthlyEmi: string | null;
  creditCardCount: number | null;
  creditCardOutstanding: string | null;
  existingLoansOutstanding: string | null;
  hasActiveExternalLoan: boolean | null;
  externalLoanLenderName: string | null;
  externalLoanOutstandingAmount: string | null;
  externalLoanAccountLast4: string | null;
  reference1Name: string | null;
  reference1Phone: string | null;
  reference1Relationship: string | null;
  reference2Name: string | null;
  reference2Phone: string | null;
  reference2Relationship: string | null;
}

/** Mirrors the backend's `CustomerOverviewDocumentDto` — one row of Customer 360's Documents section, flattened across every application. */
export interface CustomerOverviewDocument {
  id: string;
  originalFileName: string;
  category: string | null;
  typeLabel: string | null;
  uploadedAt: string;
  fileSizeBytes: string | null;
  verificationStatus: DocumentVerificationStatus;
  verifiedByName: string | null;
  verifiedAt: string | null;
  currentVersionNumber: number | null;
  uploadedByName: string | null;
}

/**
 * Mirrors the backend's `CustomerOverviewResponseDto` — Customer 360's
 * single-round-trip aggregate. `applications` reuses `LeadSummary`
 * as-is: it's the identical wire shape `GET /v1/loan-applications`
 * already returns (both are `LoanApplicationResponseDto` instances),
 * so no second application type was introduced for this screen.
 */
export interface CustomerOverview {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  photoUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  profile: CustomerProfile | null;
  applications: LeadSummary[];
  documents: CustomerOverviewDocument[];
}
