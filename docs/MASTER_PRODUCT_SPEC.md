# Master Product Specification (MPS) — Loan Manager Platform

**Version 1.0 — Frozen 2026-07-20**

This is the single source of truth for all future development on the Loan Manager platform. No further planning changes unless a critical business requirement is discovered — implementation proceeds against this document.

Status tags used throughout: ✅ Existing (built and working), 🟡 Partial (built but incomplete/unwired), 🆕 New (does not exist yet).

---

## 0. Product Vision

Rectangle Consultancy and Services Pvt. Ltd. operates Loan Manager as a **Loan Facilitation / DSA (Direct Selling Agent) platform — it is not a lender.** The platform is the bridge between customers and partner Banks/NBFCs, across three client surfaces (Customer App, Employee Portal, Admin CRM) backed by one API. Customers apply and get verified on the platform; partner lending institutions underwrite and disburse. Rectangle Consultancy owns the origination, verification, servicing-support, and relationship pipeline end-to-end, and earns its business through facilitation, not lending.

---

## 1. Complete Module List

| # | Module | Purpose | Status |
|---|---|---|---|
| 1 | Identity & Access Management | Auth, session sync, RBAC, org hierarchy-aware permissions | 🟡 Partial (3 flat roles only) |
| 2 | Branch & Organization Management | Branch/region/zone entities, staff hierarchy, TL role | 🆕 New |
| 3 | Lead Management | Capture, dedup, scoring, auto-assignment, source/campaign tracking | 🟡 Partial (assignment exists, rest new) |
| 4 | Customer Management (CRM core) | 360° profile, segmentation, KYC, consent, deletion | 🟡 Partial |
| 5 | Loan Origination | Application → underwriting → sanction → disbursement; standardized request-type enum | 🟡 Partial |
| 6 | Document Management & Verification | Catalog-driven upload; standardized staff action set (Preview / Full Screen View / Download / Verify / Reject / Request Re-upload) | ✅ Existing (action set standardization 🆕) |
| 7 | Photo/KYC Verification | Mandatory passport photo + live selfie capture; same standardized staff action set as documents | 🆕 New (mandatory) |
| 8 | Communication Hub | Unified timeline + Call/SMS/WhatsApp/Email | 🆕 New |
| 9 | Work Status & Live Monitoring | Online/busy/break status, live activity, admin override | 🟡 Partial (backend done, UI unwired) |
| 10 | Task & Follow-up / Reminder Engine | Callback tasks, stale-lead reminders, escalation on miss | 🆕 New |
| 11 | SLA & Escalation Engine | Stage-level SLA timers, breach alerts, escalation matrix | 🆕 New |
| 12 | Approval Workflow Engine | Tiered approval by amount/risk, maker-checker | 🆕 New |
| 13 | Notifications | In-app + push (FCM) | 🟡 Partial (in-app only) |
| 14 | Collections & Recovery | Overdue buckets, promise-to-pay, recovery escalation | 🆕 New |
| 15 | EMI/Repayment Servicing | Reminder cadence, NACH/auto-debit, bounce handling, receipts | 🆕 New |
| 16 | Partner (DSA) Management | Sub-DSA/connector onboarding, commission/payout, channel portal | 🆕 New |
| 17 | Lender (Bank/NBFC) Management | Partner lender master, product/rate cards, case routing — **core to the facilitation business model**, not peripheral | 🆕 New |
| 18 | Reporting & MIS | Report library, scheduled MIS packs, PAR/NPA reports | 🆕 New |
| 19 | Performance Dashboards | Employee/team/branch scorecards, leaderboards | 🟡 Partial (basic ops dashboard exists) |
| 20 | Audit & Compliance | KYC/AML screening, grievance redressal, data-access audit | 🟡 Partial (basic audit rows exist) |
| 21 | Support/Helpdesk | Customer support contact | ✅ Existing (mailto-based) |
| 22 | Catalog Management | Document types, loan products, lending partners | 🟡 Partial (document types backend-ready, no UI; loan products/lending partners entirely new) |
| 23 | Customer Benefits | Fresh Loan, Top-Up, Balance Transfer, BT+Top-Up, BT+Fresh Loan — available to existing platform customers and to new customers who already hold an active loan with any Bank/NBFC | 🆕 New |
| 24 | Loan Health Check | Evaluates an existing loan against partner rate cards, recommends BT/Top-up | 🆕 New |
| 25 | Legal | Privacy Policy, Terms & Conditions, Loan Facilitation Disclaimer, Customer Consent, Data Deletion Policy, About Company, Contact Us | 🆕 New |

---

## 2. User Roles

| Role | Surface | Purpose |
|---|---|---|
| **Customer** | Customer App | Applies for loans/benefits, uploads documents/photos, tracks status, manages profile |
| **Employee (Loan Officer/Agent)** | Employee Portal | Works assigned leads, reviews documents/photos, approves/rejects within their tier, logs communication |
| **Team Leader** 🆕 | Employee Portal | Supervises a team, reassigns within team, views team SLA/performance |
| **Branch Manager** 🆕 | Admin CRM (branch-scoped) | Owns branch targets, approves within their tier, manages branch staff |
| **Regional/Zonal Manager** 🆕 (Enterprise tier) | Admin CRM (region-scoped) | Multi-branch oversight, higher approval tier |
| **Collections Agent** 🆕 | Employee Portal (collections view) | Works overdue accounts, logs promise-to-pay, escalates for recovery |
| **Admin (Ops/Super Admin)** | Admin CRM | Lead assignment, staff provisioning, catalog management, platform-wide oversight |
| **DSA / Channel Partner** 🆕 | Partner Portal (new, limited surface) | Submits leads, tracks own payouts — external, restricted access |
| **System/Integration** 🆕 | API only | Service-to-service (lender APIs, telephony webhooks, SMS/WhatsApp delivery callbacks) |

Target RBAC state: permission-based access control (view/edit/approve independently configurable per module), with hierarchy-scoped data visibility (a TL sees only their team; a BM sees only their branch).

---

## 3. Workflows

1. **Lead-to-Customer** — Capture (multi-channel) → Dedup check → Auto-assignment → First-contact SLA timer starts → Employee works lead → Qualified → Application started.
2. **Loan Origination** — Application submitted → Document collection → Photo/KYC verification → Employee review → Tiered approval routing → Sanction → Disbursement (by partner lender) → Loan active.
3. **Document & Photo Verification** — Customer uploads → Staff Preview/Full Screen View/Download → Verify or Reject (with note) → if Rejected, targeted Request Re-upload sent to customer → customer resubmits → re-review.
4. **Query/Raise-Query** — Employee/Admin raises query → Customer notified → Customer responds → reviewer re-evaluates.
5. **Lead Assignment & Escalation** — Unassigned queue → assignment → SLA clock starts → breach escalates to TL → further breach escalates to BM → resolution logged.
6. **Approval Hierarchy (maker-checker)** — Loan amount/risk determines approver tier → maker submits recommendation → checker approves/rejects → delegation if approver unavailable → full audit trail.
7. **Employee Onboarding/Provisioning** — Admin creates/invites staff account → role + branch + reporting-manager assigned → employee completes first login → appears in hierarchy and assignment pools.
8. **Collections** — Loan reaches overdue → bucketed by DPD → collector assigned → reminder cadence fires → collector logs calls/promise-to-pay → escalation to legal/recovery if unresolved → settlement/write-off or resolution.
9. **Customer Communication** — Any outbound/inbound touchpoint logged to the customer's unified timeline, consent/DND-checked before sending.
10. **Existing Loan Onboarding** 🆕 — Customer declares an existing loan (lender, outstanding amount, rate, tenure remaining, EMI) → becomes the basis for Top-Up, BT, BT+Top-Up, or BT+Fresh requests.
11. **Customer Benefit Request Selection** 🆕 — Customer chooses request type (Fresh / Top-Up / BT / BT+Top-Up / BT+Fresh) at application start → Fresh routes to the existing wizard; the others route through the wizard plus the Existing Loan Onboarding step.
12. **Loan Health Check** 🆕 — Customer runs a check on an existing loan → system compares against partner lender rate cards → surfaces BT/Top-up recommendation → can convert directly into a Customer Benefit Request.
13. **Legal Consent Acceptance** 🆕 — Customer views Loan Facilitation Disclaimer + Privacy Policy + T&C → accepts versioned, timestamped Consent before any application is submitted; Data Deletion Policy referenced from the account-deletion flow.

---

## 4. Admin CRM Features

- Dashboard: operational stats, workload, activity feed ✅ → extended with performance scorecards/leaderboards 🆕
- Lead Assignment / Unassigned Queue (assign/reassign/bulk transfer/history) ✅
- Auto-assignment rules configuration 🆕
- Employee Status / Live Monitoring ✅ → extended with live activity feed 🆕
- Branch & hierarchy management 🆕
- Staff provisioning/invite 🆕 *(critical MVP gap)*
- Role & permission management (fine-grained RBAC) 🆕
- Approval matrix configuration 🆕
- SLA rule configuration + escalation matrix 🆕
- Loan oversight / approval-override screen, admin-reachable 🟡 → close in MVP
- **Document handling — standardized action set:** Preview, Full Screen View, Download, Verify, Reject, Request Re-upload 🟡 → applies to every uploaded document, admin-reachable
- **Photo Verification — identical standardized action set:** Preview, Full Screen View, Download, Verify, Reject, Request Re-upload 🆕
- Notification Center ✅
- Document-types catalog management UI 🟡
- Loan products catalog management 🆕
- Lending-partners catalog management 🆕
- DSA/partner management 🆕
- Lender (bank/NBFC) master data management 🆕
- Collections oversight 🆕
- Reporting & MIS 🆕
- Global audit log / compliance dashboard 🟡
- Legal content management (versioning of Privacy Policy/T&C/Disclaimer/etc.) 🆕

---

## 5. Employee Portal Features

- Auth/session ✅
- My Assigned Leads, Lead Detail, Timeline, Autosave Notes ✅
- Approve/Reject/Raise Query ✅ → evolves into maker role within tiered approval matrix 🆕
- **Document handling — standardized action set:** Preview, Full Screen View, Download, Verify, Reject, Request Re-upload 🟡 → applies to every uploaded document
- **Photo Verification — identical standardized action set:** Preview, Full Screen View, Download, Verify, Reject, Request Re-upload 🆕
- Work status (Online/Busy) + Break self-service 🟡 → wire existing built UI
- KYC review UI 🟡 → close in MVP
- Team Leader view: team performance, team SLA breaches, in-team reassignment 🆕
- Live lead board (Kanban, SLA countdowns) 🆕
- Follow-up/reminder tasking 🆕
- Click-to-call, WhatsApp, email, SMS from within a lead, logged to timeline 🆕
- Collections workspace (Collections Agent role) 🆕
- Escalation inbox 🆕

---

## 6. Customer App Features

- Splash/onboarding, Phone/OTP + Google sign-in, Home dashboard ✅
- Loan application wizard (10-step, category-aware), category selection, timeline ✅
- Documents (catalog-driven upload/preview/replace/delete) ✅
- **Photo Verification:** passport photo upload, live selfie capture, preview, retake, compression, secure upload 🆕 *(mandatory)*
- Notifications (in-app) ✅ → push (FCM) 🆕
- Profile view/edit, KYC PAN/Aadhaar (text capture) ✅
- Privacy settings, account deletion request ✅
- Support (mailto/FAQ/help center), EMI calculator ✅
- Lending Partners section 🟡 → close backend gap
- **Customer Benefits:** request-type selection (Fresh Loan / Top-Up / Balance Transfer / BT+Top-Up / BT+Fresh Loan) 🆕
- **Existing Loan Onboarding** flow (for existing platform customers and new customers with an active loan elsewhere) 🆕
- **Loan Health Check** 🆕
- **Legal:** Privacy Policy, T&C, Loan Facilitation Disclaimer, Consent capture, Data Deletion Policy, About Company, Contact Us 🆕
- Real-time granular status per query/document 🆕
- EMI/repayment tracking, due-date reminders, payment history 🆕
- Cross-sell/pre-approved offers surface 🆕
- Grievance/complaint submission with tracked status 🆕
- Communication preferences / consent center 🆕

---

## 7. Database Entities (High Level)

**Identity & Org:** `User` ✅, `Branch` 🆕, `Region`/`Zone` 🆕, `EmployeeProfile` ✅ (extended with `reportingManagerId`/`branchId`/`teamId` 🆕), `Role`/`Permission` 🆕

**Customer & Lead:** `CustomerProfile` ✅, `Lead` 🆕 (with request-type field), `LeadSource` 🆕, `Campaign` 🆕, `LeadAssignmentHistory` ✅

**Loan Origination:** `LoanApplication` ✅ (extended with request-type field), `Loan` ✅, `LoanProduct` 🆕, `CoApplicant`/`Guarantor` 🆕, `SanctionCondition` 🆕, `ApprovalMatrix`/`ApprovalDecision` 🆕

**Documents & Verification:** `DocumentType` ✅, `Document` ✅ (verification status ✅), `PhotoVerification` 🆕 (paired passport-photo + selfie record, status, reviewer)

**Customer Benefits:** `ExistingLoan` 🆕 (lender, outstanding, rate, tenure remaining, EMI), `LoanHealthCheckResult` 🆕, request-type enum: `FRESH_LOAN`, `TOP_UP`, `BALANCE_TRANSFER`, `BT_TOPUP`, `BT_FRESH` 🆕

**Legal:** `LegalDocument` 🆕 (versioned Privacy Policy/T&C/Disclaimer/Data Deletion Policy content), `ConsentRecord` 🆕 (versioned, timestamped acceptance)

**Communication:** `CommunicationLog` 🆕, `CallRecord` 🆕, `Template` 🆕, `Notification` ✅

**Operations:** `WorkStatus`/`EmployeeBreak` ✅, `Task`/`Reminder` 🆕, `SLARule` 🆕, `Escalation` 🆕

**Collections & Servicing:** `Payment` ✅ (schema-only today), `EMISchedule` 🆕, `CollectionCase` 🆕, `PromiseToPay` 🆕

**Partner & Lender:** `DSAPartner` 🆕, `PartnerCommission` 🆕, `LenderPartner` 🆕 (formerly "Lending Partner," expanded with product/rate data)

**Compliance:** `AuditLog` ✅ (expand to platform-wide), `ComplianceCheck`/`KYCScreening` 🆕, `GrievanceCase` 🆕

---

## 8. Feature Dependencies

1. RBAC + Org Hierarchy must exist before hierarchy-scoped lead visibility, TL dashboards, tiered Approval Matrix, branch-level reporting.
2. Unified Timeline must exist before the Communication Hub (writes into it) and before unified Activity History/Audit.
3. Approval Matrix depends on Org Hierarchy.
4. SLA Engine depends on the Unified Timeline and Org Hierarchy.
5. Photo Verification depends only on the existing Document Management pattern — no hierarchy dependency, can ship early (MVP).
6. Collections depends on `Loan` being active/disbursed with a real `EMISchedule`.
7. Partner (DSA) Management depends on Lead Source tracking and Approval/Commission logic.
8. **Loan Health Check and Balance Transfer request types depend on partner lender rate-card data** → a minimal **Lender/Loan Product catalog** (product + indicative rate per partner) must exist by Production phase, not Enterprise. Full lender *integration* (API sync, payout reconciliation) remains Enterprise.
9. **Customer Benefits (Top-Up/BT/BT+X) depend on Existing Loan Onboarding existing first** (data input for eligibility).
10. Reporting & MIS depends on nearly everything above emitting structured, queryable events — sequenced last among Production-phase items.
11. Staff Provisioning has no dependencies and blocks realistic use of Org Hierarchy — must land early (MVP).
12. **Request-type enum (`FRESH_LOAN`/`TOP_UP`/`BALANCE_TRANSFER`/`BT_TOPUP`/`BT_FRESH`) is reserved on `Lead`/`LoanApplication` at MVP** — even though only `FRESH_LOAN` is functional then — to avoid a breaking schema change when Customer Benefits ships in Production. The other four remain feature-flagged off until then.

---

## 9. Final Development Phases

### MVP — a coherent, safe, single-branch facilitation loop
- Close existing gaps: admin-reachable loan/document review routes, wire the built-but-unmounted Work Status UI, staff provisioning endpoint + minimal UI
- **Photo/KYC Verification** (full stack: Customer App capture + Employee Portal/Admin CRM standardized action set — Preview, Full Screen View, Download, Verify, Reject, Request Re-upload)
- **Document Management** — retrofit the same standardized action set onto existing document handling in Employee Portal and Admin CRM
- Document-types & lending-partners catalog UI
- Loan Products table
- **Legal module** (Privacy Policy, T&C, Loan Facilitation Disclaimer, Consent, Data Deletion Policy, About Company, Contact Us)
- **Request-type enum reserved** on `Lead`/`LoanApplication` (`FRESH_LOAN` enabled/functional; `TOP_UP`/`BALANCE_TRANSFER`/`BT_TOPUP`/`BT_FRESH` reserved, feature-flagged off)
- Basic RBAC hardening

### Production — operationally robust, multi-branch ready
- Branch & Org Hierarchy, Team Leader role, hierarchy-scoped visibility
- Tiered Approval Matrix / maker-checker
- SLA & Escalation Engine
- Unified Communication Timeline + Call/SMS/WhatsApp/Email integration
- Lead Intelligence: dedup, scoring, auto-assignment rules, source/campaign tracking
- Reporting & MIS core library, performance dashboards/scorecards
- Push notifications (FCM)
- Live employee/lead monitoring dashboards
- **Customer Benefits module released** (Top-Up, BT, BT+Top-Up, BT+Fresh feature flags enabled) + Existing Loan Onboarding
- **Loan Health Check**
- Minimum-viable Lender/Loan Product rate catalog (pulled forward from Enterprise)

### Enterprise — scale, ecosystem, compliance-grade
- Collections & Recovery + EMI Servicing automation
- Partner (DSA) Management + self-service channel portal
- Full Lender integration (API sync, commission/payout reconciliation, automated case routing)
- Full Compliance & Audit module (KYC/AML screening, regulatory MIS, grievance redressal SLA)
- Loan Origination depth (co-applicants, tranche disbursement, restructuring, foreclosure/NOC)
- Customer 360 & Retention (segmentation, cross-sell, NPS/CSAT, re-KYC)
- Infrastructure scale-out (multi-instance storage, Redis-backed rate limiting)
- Live PAN/Aadhaar/CIBIL vendor integrations (compliance-gated, legal review required first)

---

## 10. Version History

- **v1.0 (2026-07-20)** — Frozen. Base MPS + Loan Facilitation/DSA business-model correction + Customer Benefits, Loan Health Check, and Legal modules added + standardized document/photo staff action set (Preview, Full Screen View, Download, Verify, Reject, Request Re-upload) + reserved request-type enum (`FRESH_LOAN`, `TOP_UP`, `BALANCE_TRANSFER`, `BT_TOPUP`, `BT_FRESH`).
