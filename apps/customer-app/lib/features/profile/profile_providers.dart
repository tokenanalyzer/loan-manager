import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models/customer_profile.dart';
import '../../core/models/user_profile.dart';
import '../../core/riverpod/providers.dart';

class ProfileOverview {
  const ProfileOverview({required this.user, required this.customerProfile});

  final UserProfile user;
  final CustomerProfile? customerProfile;
}

final profileOverviewProvider =
    FutureProvider.autoDispose<ProfileOverview>((ref) async {
  final userRepository = ref.read(userRepositoryProvider);
  final customerProfileRepository = ref.read(customerProfileRepositoryProvider);

  final userResult = await userRepository.getMe();
  final profileResult = await customerProfileRepository.getMyProfile();

  final user =
      userResult.when(success: (data) => data, failure: (error) => throw error);
  final profile = profileResult.when(
      success: (data) => data, failure: (error) => throw error);

  return ProfileOverview(user: user, customerProfile: profile);
});
