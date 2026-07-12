import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:loan_manager_customer_app/core/app.dart';
import 'package:loan_manager_customer_app/features/home/home_controller.dart';

/// Fakes the dashboard data so this test doesn't depend on a live
/// backend — HomeScreen (a ConsumerWidget) needs a ProviderScope
/// ancestor regardless, but overriding `homeControllerProvider`
/// avoids the real network calls `HomeController.build()` would
/// otherwise make.
class _FakeHomeController extends HomeController {
  @override
  Future<HomeDashboardData> build() async {
    return const HomeDashboardData(
        userProfile: null, applications: [], unreadNotificationCount: 0);
  }
}

void main() {
  testWidgets('CustomerApp builds and shows the Home dashboard',
      (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          homeControllerProvider.overrideWith(_FakeHomeController.new)
        ],
        child: const CustomerApp(),
      ),
    );
    await tester.pumpAndSettle();

    expect(
      find.text('Phase 2 development environment is running.'),
      findsOneWidget,
    );
  });
}
