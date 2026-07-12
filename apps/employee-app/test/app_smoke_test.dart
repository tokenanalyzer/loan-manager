import 'package:flutter_test/flutter_test.dart';
import 'package:loan_manager_employee_app/core/app.dart';

void main() {
  testWidgets('EmployeeApp builds and shows the placeholder home screen',
      (tester) async {
    await tester.pumpWidget(const EmployeeApp());
    await tester.pumpAndSettle();

    expect(
      find.text('Phase 2 development environment is running.'),
      findsOneWidget,
    );
  });
}
