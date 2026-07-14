import 'package:flutter/material.dart';

/// Static loan-category catalog — shared by the Customer App (loan
/// selection/application UI, eligibility/offer cards) and the Employee
/// App (showing the reviewer the indicative rate range for the
/// category a customer applied under).
///
/// There is no backend "loan product" catalog entity — categories map
/// onto the existing `purpose` free-text field on submission, plus a
/// `categoryId` the backend validates against its own
/// `LOAN_CATEGORY_BOUNDS` map
/// (`apps/backend/src/loan-applications/loan-application.constants.ts`
/// — kept in sync with this list by convention). This duplication is
/// intentional-for-now — see docs/architecture-review-2026-07.md for
/// the recommendation to replace both with one shared product-catalog
/// table.
///
/// Six categories matching what a real Indian lending app offers:
/// Personal, Home, Business, Education, Vehicle, Gold. Amounts,
/// tenures, indicative rates, and processing fees reflect typical
/// Indian bank/NBFC retail-lending economics (2025-26) — a secured,
/// long-tenure product like Home Loan has a materially lower rate and
/// higher ceiling than an unsecured short-tenure product like Gold
/// Loan, which is deliberate, not arbitrary.
class LoanCategory {
  const LoanCategory({
    required this.id,
    required this.title,
    required this.icon,
    required this.description,
    required this.minAmount,
    required this.maxAmount,
    required this.minTermMonths,
    required this.maxTermMonths,
    required this.indicativeRateMin,
    required this.indicativeRateMax,
    required this.processingFeePercent,
    required this.eligibilityNotes,
  });

  final String id;
  final String title;
  final IconData icon;
  final String description;
  final double minAmount;
  final double maxAmount;
  final int minTermMonths;
  final int maxTermMonths;

  /// Indicative annual interest rate range (%), shown as an estimate
  /// before submission. The real rate is set by a staff reviewer at
  /// approval time — this is never a quoted/binding rate.
  final double indicativeRateMin;
  final double indicativeRateMax;

  /// One-time processing fee, as a fraction of principal (e.g. 0.02 =
  /// 2%). 18% GST applies on top of this fee, per Indian tax treatment
  /// of loan-processing services — shown as part of the cost
  /// breakdown, never folded into the EMI itself.
  final double processingFeePercent;

  final List<String> eligibilityNotes;

  /// Midpoint of the indicative rate range — used for the live EMI
  /// preview so it shows one number, not a range.
  double get indicativeRateMidpoint =>
      (indicativeRateMin + indicativeRateMax) / 2;
}

const List<LoanCategory> kLoanCategories = [
  LoanCategory(
    id: 'personal',
    title: 'Personal Loan',
    icon: Icons.person_outline,
    description:
        'For everyday needs — from a medical emergency to a wedding or family expense.',
    minAmount: 25000,
    maxAmount: 1500000,
    minTermMonths: 6,
    maxTermMonths: 60,
    indicativeRateMin: 10.5,
    indicativeRateMax: 24,
    processingFeePercent: 0.02,
    eligibilityNotes: [
      'Generally suited to steady, verifiable salaried or self-employed income',
      'No collateral required',
      'PAN and Aadhaar-based KYC required before submission',
      'Flexible use of funds',
    ],
  ),
  LoanCategory(
    id: 'home',
    title: 'Home Loan',
    icon: Icons.home_outlined,
    description:
        'Buy, build, or renovate a home with a long-tenure, lower-rate secured loan.',
    minAmount: 500000,
    maxAmount: 50000000,
    minTermMonths: 60,
    maxTermMonths: 360,
    indicativeRateMin: 8.0,
    indicativeRateMax: 10.5,
    processingFeePercent: 0.005,
    eligibilityNotes: [
      'Secured against the property being purchased or built',
      'Longer tenure keeps the EMI affordable relative to the loan size',
      'Property papers and income proof are required during review',
    ],
  ),
  LoanCategory(
    id: 'business',
    title: 'Business Loan',
    icon: Icons.storefront_outlined,
    description: 'Working capital or equipment financing for your business.',
    minAmount: 100000,
    maxAmount: 5000000,
    minTermMonths: 12,
    maxTermMonths: 60,
    indicativeRateMin: 11,
    indicativeRateMax: 20,
    processingFeePercent: 0.02,
    eligibilityNotes: [
      'Business income/records (GST returns, bank statements) may be requested during review',
      'Udyam/MSME registration helps, but is not required to apply',
    ],
  ),
  LoanCategory(
    id: 'education',
    title: 'Education Loan',
    icon: Icons.school_outlined,
    description:
        'Cover tuition, hostel, or other costs for study in India or abroad.',
    minAmount: 25000,
    maxAmount: 4000000,
    minTermMonths: 12,
    maxTermMonths: 120,
    indicativeRateMin: 8,
    indicativeRateMax: 13,
    processingFeePercent: 0.01,
    eligibilityNotes: [
      'Suited to tuition and direct education costs',
      'Co-applicant (parent/guardian) may be requested for students without income',
    ],
  ),
  LoanCategory(
    id: 'vehicle',
    title: 'Vehicle Loan',
    icon: Icons.directions_car_outlined,
    description:
        'Finance a new or used car or two-wheeler with a structured repayment plan.',
    minAmount: 50000,
    maxAmount: 2500000,
    minTermMonths: 12,
    maxTermMonths: 84,
    indicativeRateMin: 8.5,
    indicativeRateMax: 14,
    processingFeePercent: 0.01,
    eligibilityNotes: [
      'Typically for a specific vehicle purchase',
      'Longer terms available for larger amounts',
      'Vehicle may be held as security until the loan is closed',
    ],
  ),
  LoanCategory(
    id: 'gold',
    title: 'Gold Loan',
    icon: Icons.workspace_premium_outlined,
    description:
        'Quick funds against your gold jewellery, with a short repayment term.',
    minAmount: 10000,
    maxAmount: 2500000,
    minTermMonths: 3,
    maxTermMonths: 36,
    indicativeRateMin: 9,
    indicativeRateMax: 15,
    processingFeePercent: 0.01,
    eligibilityNotes: [
      'Secured against gold jewellery — fast approval and disbursal',
      'Loan amount depends on the appraised value and purity of the gold',
      'Ornaments are held safely and returned on full repayment',
    ],
  ),
];

LoanCategory? findLoanCategory(String id) {
  for (final category in kLoanCategories) {
    if (category.id == id) return category;
  }
  return null;
}
