import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models/lending_partner.dart';
import '../../core/riverpod/providers.dart';

/// Backs the Home dashboard's Lending Partners section.
///
/// Fails soft to an empty list on any error — including the expected
/// 404 today, since `GET /v1/lending-partners` doesn't exist until a
/// future sprint adds it (see `LendingPartnerRepository`). This is a
/// non-critical dashboard section, not a flow the user can get stuck
/// on, so a partner-catalog hiccup should never surface an error
/// state — the UI just shows the "more partners coming soon" card,
/// same as it does for a genuinely empty catalog.
final lendingPartnersProvider =
    FutureProvider.autoDispose<List<LendingPartner>>((ref) async {
  final repository = ref.read(lendingPartnerRepositoryProvider);
  final result = await repository.getActivePartners();
  return result.when(success: (partners) => partners, failure: (_) => const []);
});
