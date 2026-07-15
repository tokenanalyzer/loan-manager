/// The loan-application wizard's possible steps. Every field behind
/// every step already has a real, persisted home — either
/// `CustomerProfile` (personal/address/employment/income/existing
/// loans/nominee/references — see `customer_profile.dart`) or the
/// loan application itself (`loanRequirement`) — nothing here is UI
/// without a backend to save it to.
enum WizardStep {
  personal,
  address,
  employment,
  income,
  existingLoans,
  loanRequirement,
  nominee,
  references,
  documents,
  review,
}

extension WizardStepLabel on WizardStep {
  String get label => switch (this) {
        WizardStep.personal => 'Personal',
        WizardStep.address => 'Address',
        WizardStep.employment => 'Employment',
        WizardStep.income => 'Income',
        WizardStep.existingLoans => 'Existing loans',
        WizardStep.loanRequirement => 'Loan',
        WizardStep.nominee => 'Nominee',
        WizardStep.references => 'References',
        WizardStep.documents => 'Documents',
        WizardStep.review => 'Review',
      };
}

/// Per-category step plan — each loan category asks only what real
/// Indian lenders actually ask for that product, not a one-size-fits
/// every-loan questionnaire:
///
/// - Gold/Vehicle are asset-backed, fast-turnaround products — minimal
///   underwriting, no reference/existing-EMI checks. Gold also skips
///   Employment/Income entirely (a gold loan is secured against the
///   collateral itself, not the applicant's income).
/// - Education applicants typically have no prior credit history, so
///   the Existing Loans step is skipped.
/// - Personal/Home/Business are the fullest, most scrutinized
///   products — every step applies.
///
/// `Documents` and `Review` always apply.
List<WizardStep> stepsForCategory(String? categoryId) {
  const full = [
    WizardStep.personal,
    WizardStep.address,
    WizardStep.employment,
    WizardStep.income,
    WizardStep.existingLoans,
    WizardStep.loanRequirement,
    WizardStep.nominee,
    WizardStep.references,
    WizardStep.documents,
    WizardStep.review,
  ];

  switch (categoryId) {
    case 'vehicle':
      return const [
        WizardStep.personal,
        WizardStep.address,
        WizardStep.employment,
        WizardStep.income,
        WizardStep.loanRequirement,
        WizardStep.nominee,
        WizardStep.documents,
        WizardStep.review,
      ];
    case 'gold':
      return const [
        WizardStep.personal,
        WizardStep.address,
        WizardStep.loanRequirement,
        WizardStep.nominee,
        WizardStep.documents,
        WizardStep.review,
      ];
    case 'education':
      return const [
        WizardStep.personal,
        WizardStep.address,
        WizardStep.employment,
        WizardStep.income,
        WizardStep.loanRequirement,
        WizardStep.nominee,
        WizardStep.references,
        WizardStep.documents,
        WizardStep.review,
      ];
    case 'personal':
    case 'home':
    case 'business':
    default:
      // Unknown/absent categoryId falls back to the fullest plan —
      // the safe default when we can't tailor the ask.
      return full;
  }
}
