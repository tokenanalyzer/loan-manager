import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:loan_manager_employee_app/core/app.dart';
import 'package:loan_manager_employee_app/core/models/loan_application.dart';
import 'package:loan_manager_employee_app/features/loans/applications_controller.dart';
import 'package:loan_manager_employee_app/features/notifications/notifications_controller.dart';

/// Fakes the applications list so this test doesn't depend on a live
/// backend — HomeScreen (a ConsumerWidget) needs a ProviderScope
/// ancestor regardless (missing one throws "Bad state: No
/// ProviderScope found", not a graceful empty state), which this test
/// was missing entirely before this fix.
class _FakeApplicationsController extends ApplicationsController {
  @override
  Future<List<LoanApplication>> build() async => const [];
}

void main() {
  testWidgets('EmployeeApp builds and shows the staff dashboard',
      (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          applicationsControllerProvider.overrideWith(_FakeApplicationsController.new),
          notificationsProvider.overrideWith((ref) async => const []),
        ],
        child: const EmployeeApp(),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Staff dashboard'), findsOneWidget);
  });
}
