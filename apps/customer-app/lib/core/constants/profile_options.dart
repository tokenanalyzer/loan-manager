/// Dropdown option lists for the profile/application-form personal
/// and address fields — plain constants, same pattern as
/// `kEmploymentStatusOptions`/`kNomineeRelationshipOptions` in
/// `indian_states.dart` (no backend lookup table for these; they
/// don't change often enough to need one).
const List<String> kGenderOptions = ['Male', 'Female', 'Other'];

const List<String> kMaritalStatusOptions = ['Single', 'Married', 'Divorced', 'Widowed'];

const List<String> kResidenceTypeOptions = ['Owned', 'Rented', 'Family-owned', 'Company-provided'];

/// LAP (Loan Against Property) collateral fields — must match the
/// backend's `PROPERTY_TYPE_OPTIONS`/`PROPERTY_OWNERSHIP_OPTIONS`
/// (`loan-application.constants.ts`) exactly, since submission is
/// validated against those.
const List<String> kPropertyTypeOptions = ['Residential', 'Commercial', 'Industrial', 'Land/Plot'];

const List<String> kPropertyOwnershipOptions = [
  'Self-owned',
  'Joint ownership',
  'Family property',
  'Other',
];
