import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_flutter/shared_flutter.dart';

import '../../core/models/app_notification.dart';
import '../../core/models/customer_profile.dart';
import '../../core/models/loan_application.dart';
import '../../core/models/user_profile.dart';
import '../../core/riverpod/providers.dart';

enum ActivityKind { submitted, approved, rejected, notification }

class RecentActivityItem {
  const RecentActivityItem({
    required this.title,
    required this.subtitle,
    required this.timestamp,
    required this.kind,
  });

  final String title;
  final String subtitle;
  final DateTime timestamp;
  final ActivityKind kind;
}

class EligibilityOffer {
  const EligibilityOffer({required this.category, required this.eligibleAmount});

  final LoanCategory category;
  final double eligibleAmount;
}

class HomeDashboardData {
  const HomeDashboardData({
    required this.userProfile,
    required this.customerProfile,
    required this.applications,
    required this.notifications,
    required this.documentsComplete,
  });

  final UserProfile? userProfile;
  final CustomerProfile? customerProfile;
  final List<LoanApplication> applications;
  final List<AppNotification> notifications;
  final bool documentsComplete;

  List<LoanApplication> get activeApplications => applications
      .where((app) => app.status == 'submitted' || app.status == 'under_review')
      .toList();

  List<LoanApplication> get approvedLoans =>
      applications.where((app) => app.loan != null).toList();

  int get unreadNotificationCount =>
      notifications.where((n) => !n.isRead).length;

  /// Total monthly EMI the customer already carries across approved
  /// loans — subtracted from income when estimating eligibility for a
  /// *new* loan, so we never suggest more capacity than actually free.
  double get totalMonthlyEmi => approvedLoans.fold(
      0.0, (sum, app) => sum + app.loan!.monthlyInstallment);

  DateTime? get nextMaturityDate {
    final dates = approvedLoans
        .map((app) => app.loan!.maturityDate)
        .whereType<String>()
        .map(DateTime.parse)
        .toList();
    if (dates.isEmpty) return null;
    dates.sort();
    return dates.first;
  }

  /// Real, disclosed "Profile Strength" — not a fabricated credit
  /// score. Four honest signals, 25% each.
  double get profileStrength {
    var score = 0.0;
    if (customerProfile?.addressLine1 != null) score += 0.25;
    if (customerProfile?.monthlyIncome != null) score += 0.25;
    if (customerProfile?.isKycComplete ?? false) score += 0.25;
    if (documentsComplete) score += 0.25;
    return score;
  }

  /// The single biggest thing standing between the customer and a
  /// stronger profile — used as the dashboard's one-line CTA.
  String? get profileStrengthNudge {
    if (customerProfile?.addressLine1 == null) {
      return 'Add your address to strengthen your profile.';
    }
    if (customerProfile?.monthlyIncome == null) {
      return 'Add your income to see your loan eligibility.';
    }
    if (!(customerProfile?.isKycComplete ?? false)) {
      return 'Complete your KYC to unlock better offers.';
    }
    if (!documentsComplete) {
      return 'Upload your remaining documents to complete your profile.';
    }
    return null;
  }

  /// Every category the customer hasn't already applied for, with a
  /// real, formula-based eligible amount (see
  /// `estimateEligibleAmount`) — empty if income hasn't been declared
  /// yet, rather than showing a fabricated number. Sorted by eligible
  /// amount, highest first, so "Pre-approved Offers" (the top few) and
  /// "Recommended Loan Products" (the rest) are one consistent,
  /// explainable ordering rather than two different heuristics.
  List<EligibilityOffer> get eligibilityOffers {
    final income = double.tryParse(customerProfile?.monthlyIncome ?? '');
    if (income == null || income <= 0) return const [];

    final appliedCategoryIds =
        applications.map((app) => app.categoryId).whereType<String>().toSet();

    final offers = <EligibilityOffer>[];
    for (final category in kLoanCategories) {
      if (appliedCategoryIds.contains(category.id)) continue;

      final amount = estimateEligibleAmount(
        monthlyIncome: income,
        existingMonthlyEmiObligations: totalMonthlyEmi,
        tenureMonths: category.maxTermMonths,
        annualRatePercent: category.indicativeRateMidpoint,
        categoryMaxAmount: category.maxAmount,
      );

      if (amount >= category.minAmount) {
        offers.add(EligibilityOffer(category: category, eligibleAmount: amount));
      }
    }

    offers.sort((a, b) => b.eligibleAmount.compareTo(a.eligibleAmount));
    return offers;
  }

  /// Applications merged with notifications, newest first — a single
  /// real activity feed rather than repeating the same data in
  /// separate sections.
  List<RecentActivityItem> get recentActivity {
    final items = <RecentActivityItem>[];

    for (final application in applications) {
      final category = application.categoryId != null
          ? findLoanCategory(application.categoryId!)
          : null;
      final label = category?.title ?? 'Loan application';

      if (application.reviewedAt != null) {
        final approved = application.status == 'approved';
        items.add(RecentActivityItem(
          title: approved ? '$label approved' : '$label update',
          subtitle: Formatters.currency(application.requestedAmount),
          timestamp: application.reviewedAt!,
          kind: approved ? ActivityKind.approved : ActivityKind.rejected,
        ));
      } else {
        items.add(RecentActivityItem(
          title: '$label submitted',
          subtitle: Formatters.currency(application.requestedAmount),
          timestamp: application.submittedAt,
          kind: ActivityKind.submitted,
        ));
      }
    }

    for (final notification in notifications) {
      items.add(RecentActivityItem(
        title: notification.title,
        subtitle: notification.body,
        timestamp: notification.createdAt,
        kind: ActivityKind.notification,
      ));
    }

    items.sort((a, b) => b.timestamp.compareTo(a.timestamp));
    return items.take(5).toList();
  }
}

/// Aggregates everything the Home dashboard shows in one place, so
/// the screen itself stays presentation-only (no business logic).
class HomeController extends AsyncNotifier<HomeDashboardData> {
  @override
  Future<HomeDashboardData> build() async {
    final userRepository = ref.read(userRepositoryProvider);
    final loanRepository = ref.read(loanApplicationRepositoryProvider);
    final notificationRepository = ref.read(notificationRepositoryProvider);
    final customerProfileRepository = ref.read(customerProfileRepositoryProvider);
    final documentRepository = ref.read(documentRepositoryProvider);

    final userResult = await userRepository.getMe();
    final applicationsResult = await loanRepository.getMyApplications();
    final notificationsResult = await notificationRepository.getMyNotifications();
    final profileResult = await customerProfileRepository.getMyProfile();
    final documentsResult = await documentRepository.getOverview();

    final userProfile =
        userResult.when(success: (data) => data, failure: (_) => null);
    final applications = applicationsResult.when(
      success: (data) => data,
      failure: (error) => throw error,
    );
    final notifications = notificationsResult.when(
      success: (data) => data,
      failure: (error) => throw error,
    );
    final customerProfile =
        profileResult.when(success: (data) => data, failure: (_) => null);
    final documentsComplete = documentsResult.when(
      success: (overview) => overview.categories
          .expand((group) => group.types)
          .where((type) => type.isRequired)
          .every((type) => type.isComplete),
      failure: (_) => false,
    );

    return HomeDashboardData(
      userProfile: userProfile,
      customerProfile: customerProfile,
      applications: applications,
      notifications: notifications,
      documentsComplete: documentsComplete,
    );
  }

  Future<void> refresh() async {
    state = const AsyncLoading<HomeDashboardData>().copyWithPrevious(state);
    state = await AsyncValue.guard(build);
  }
}

final homeControllerProvider =
    AsyncNotifierProvider<HomeController, HomeDashboardData>(
  HomeController.new,
);
