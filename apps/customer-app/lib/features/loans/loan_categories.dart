import 'package:flutter/material.dart';

/// Static loan-category catalog.
///
/// There is no backend "loan product" catalog entity — categories map
/// onto the existing `purpose` free-text field on submission (see
/// `LoanApplicationRepository.submit`). This is intentionally
/// presented as general product framing, not a personalized
/// eligibility decision (no such engine exists on the backend).
class LoanCategory {
  const LoanCategory({
    required this.id,
    required this.title,
    required this.icon,
    required this.description,
    required this.minAmount,
    required this.maxAmount,
    required this.eligibilityNotes,
  });

  final String id;
  final String title;
  final IconData icon;
  final String description;
  final double minAmount;
  final double maxAmount;
  final List<String> eligibilityNotes;
}

const List<LoanCategory> kLoanCategories = [
  LoanCategory(
    id: 'personal',
    title: 'Personal Loan',
    icon: Icons.person_outline,
    description: 'For everyday needs — from unexpected bills to a well-earned vacation.',
    minAmount: 500,
    maxAmount: 20000,
    eligibilityNotes: [
      'Generally suited to steady, verifiable income',
      'No collateral required',
      'Flexible use of funds',
    ],
  ),
  LoanCategory(
    id: 'auto',
    title: 'Auto Loan',
    icon: Icons.directions_car_outlined,
    description: 'Finance a new or used vehicle with a structured repayment plan.',
    minAmount: 2000,
    maxAmount: 50000,
    eligibilityNotes: [
      'Typically for a specific vehicle purchase',
      'Longer terms available for larger amounts',
    ],
  ),
  LoanCategory(
    id: 'home_improvement',
    title: 'Home Improvement',
    icon: Icons.home_repair_service_outlined,
    description: 'Renovate, repair, or upgrade your home.',
    minAmount: 1000,
    maxAmount: 50000,
    eligibilityNotes: [
      'Funds typically released after application review',
      'Larger amounts may require additional documentation',
    ],
  ),
  LoanCategory(
    id: 'education',
    title: 'Education',
    icon: Icons.school_outlined,
    description: 'Cover tuition, materials, or other education-related costs.',
    minAmount: 500,
    maxAmount: 30000,
    eligibilityNotes: ['Suited to tuition and direct education costs'],
  ),
  LoanCategory(
    id: 'business',
    title: 'Small Business',
    icon: Icons.storefront_outlined,
    description: 'Working capital or equipment financing for your business.',
    minAmount: 1000,
    maxAmount: 50000,
    eligibilityNotes: [
      'Business income/records may be requested during review',
    ],
  ),
  LoanCategory(
    id: 'emergency',
    title: 'Emergency',
    icon: Icons.local_hospital_outlined,
    description: 'Fast access to funds for urgent, unplanned expenses.',
    minAmount: 500,
    maxAmount: 10000,
    eligibilityNotes: ['Prioritized review where possible'],
  ),
];

LoanCategory? findLoanCategory(String id) {
  for (final category in kLoanCategories) {
    if (category.id == id) return category;
  }
  return null;
}
