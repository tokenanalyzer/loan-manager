import 'package:flutter_test/flutter_test.dart';
import 'package:loan_manager_employee_app/core/app.dart';

void main() {
  testWidgets('EmployeeApp builds and shows the staff dashboard',
      (tester) async {
    await tester.pumpWidget(const EmployeeApp());
    await tester.pumpAndSettle();

    expect(find.text('Staff dashboard'), findsOneWidget);
  });
}
