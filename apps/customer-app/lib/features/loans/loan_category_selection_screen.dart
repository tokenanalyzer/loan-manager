import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_flutter/shared_flutter.dart';

import '../../core/constants/category_style.dart';
import '../../core/widgets/app_card.dart';
import '../../core/widgets/fade_slide_in.dart';

/// Step 1 of the loan journey: pick a category. Maps to the existing
/// `purpose` field on submission — see `LoanCategory` in
/// `package:shared_flutter`.
///
/// Each tile is color-coded via [CategoryStyle] so the grid reads by
/// color, not just label, and its icon `Hero`s into the matching
/// category's Loan Details header on tap.
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
          childAspectRatio: 1.05,
        ),
        itemCount: kLoanCategories.length,
        itemBuilder: (context, index) {
          final category = kLoanCategories[index];
          final style = CategoryStyle.forId(category.id);
          return FadeSlideIn(
            delay: Duration(milliseconds: 40 * index),
            child: AppCard(
              onTap: () => context.push('/loans/apply?categoryId=${category.id}'),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Hero(
                    tag: 'category-icon-${category.id}',
                    child: Container(
                      width: 56,
                      height: 56,
                      decoration: BoxDecoration(color: style.tint, shape: BoxShape.circle),
                      child: Icon(style.icon, size: 28, color: style.color),
                    ),
                  ),
                  const SizedBox(height: 14),
                  Text(
                    category.title,
                    textAlign: TextAlign.center,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.titleSmall,
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
