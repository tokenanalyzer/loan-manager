import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_flutter/shared_flutter.dart';

import '../../core/widgets/app_card.dart';

/// Step 1 of the loan journey: pick a category. Maps to the existing
/// `purpose` field on submission — see `LoanCategory` in
/// `package:shared_flutter`.
class LoanCategorySelectionScreen extends StatelessWidget {
  const LoanCategorySelectionScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Choose a loan type')),
      body: GridView.builder(
        padding: const EdgeInsets.all(16),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          childAspectRatio: 1.1,
        ),
        itemCount: kLoanCategories.length,
        itemBuilder: (context, index) {
          final category = kLoanCategories[index];
          return AppCard(
            onTap: () => context.push('/loans/categories/${category.id}'),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(category.icon,
                    size: 36, color: Theme.of(context).colorScheme.primary),
                const SizedBox(height: 12),
                Text(
                  category.title,
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.titleMedium,
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
