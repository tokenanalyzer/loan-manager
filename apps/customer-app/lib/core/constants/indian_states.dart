/// India's 28 states + 8 union territories, for the profile "State"
/// dropdown. Kept as a plain constant list — no backend lookup table
/// exists for this (nor does it need one; it doesn't change often).
const List<String> kIndianStatesAndUnionTerritories = [
  'Andaman and Nicobar Islands',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu and Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
];

/// Employment-status options shown in the profile edit form.
const List<String> kEmploymentStatusOptions = [
  'Salaried',
  'Self-Employed (Business)',
  'Self-Employed (Professional)',
  'Student',
  'Homemaker',
  'Retired',
  'Unemployed',
];

/// Nominee-relationship options shown in the profile edit form.
const List<String> kNomineeRelationshipOptions = [
  'Spouse',
  'Parent',
  'Child',
  'Sibling',
  'Other',
];
