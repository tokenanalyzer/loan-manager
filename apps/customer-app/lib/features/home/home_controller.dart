import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models/loan_application.dart';
import '../../core/models/user_profile.dart';
import '../../core/riverpod/providers.dart';

class HomeDashboardData {
  const HomeDashboardData({
    required this.userProfile,
    required this.applications,
    required this.unreadNotificationCount,
  });

  final UserProfile? userProfile;
  final List<LoanApplication> applications;
  final int unreadNotificationCount;

  List<LoanApplication> get activeApplications => applications
      .where((app) => app.status == 'submitted' || app.status == 'under_review')
      .toList();
}

/// Aggregates everything the Home dashboard shows in one place, so
/// the screen itself stays presentation-only (no business logic).
class HomeController extends AsyncNotifier<HomeDashboardData> {
  @override
  Future<HomeDashboardData> build() async {
    final userRepository = ref.read(userRepositoryProvider);
    final loanRepository = ref.read(loanApplicationRepositoryProvider);
    final notificationRepository = ref.read(notificationRepositoryProvider);

    final userResult = await userRepository.getMe();
    final applicationsResult = await loanRepository.getMyApplications();
    final notificationsResult = await notificationRepository.getMyNotifications();

    final userProfile = userResult.when(success: (data) => data, failure: (_) => null);
    final applications = applicationsResult.when(
      success: (data) => data,
      failure: (error) => throw error,
    );
    final notifications = notificationsResult.when(
      success: (data) => data,
      failure: (error) => throw error,
    );

    return HomeDashboardData(
      userProfile: userProfile,
      applications: applications,
      unreadNotificationCount: notifications.where((n) => !n.isRead).length,
    );
  }

  Future<void> refresh() async {
    state = const AsyncLoading<HomeDashboardData>().copyWithPrevious(state);
    state = await AsyncValue.guard(build);
  }
}

final homeControllerProvider = AsyncNotifierProvider<HomeController, HomeDashboardData>(
  HomeController.new,
);
