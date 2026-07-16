import 'package:shared_flutter/shared_flutter.dart';

import '../models/lending_partner.dart';

/// Repository for the Home dashboard's Lending Partners section.
///
/// `GET /v1/lending-partners` does not exist on the backend yet — this
/// sprint (Customer App production freeze) deliberately adds no
/// database table, migration, or endpoint for it; that's future
/// Admin Panel/Bank Portal work. This repository is written and wired
/// exactly like every other one (`DocumentRepository`,
/// `NotificationRepository`, ...) so that the day that endpoint ships,
/// the Home dashboard starts showing real partners automatically —
/// zero Flutter code changes required. See `lendingPartnersProvider`
/// (`features/home/lending_partners_provider.dart`), which calls this
/// and fails soft to an empty list today.
class LendingPartnerRepository extends BaseRepository {
  LendingPartnerRepository(super.apiClient);

  Future<ApiResult<List<LendingPartner>>> getActivePartners() {
    return get<List<LendingPartner>>(
      '/v1/lending-partners',
      mapper: (data) => (data as List<dynamic>)
          .map((item) => LendingPartner.fromJson(item as Map<String, dynamic>))
          .toList(),
    );
  }
}
