import 'package:flutter/material.dart';

/// Per-category accent color + icon, keyed by [LoanCategory.id].
///
/// Customer-app-only presentation data — deliberately not added to
/// the shared `LoanCategory` model in `package:shared_flutter`, since
/// that model is shared with the Employee App and the backend's
/// category-id contract; a color/icon choice is a customer-app visual
/// concern only. Used everywhere a loan category appears (category
/// grid, "Loans for you", application lists, application detail) so
/// the whole app color-codes categories consistently, not just one
/// screen.
class CategoryStyle {
  const CategoryStyle({required this.color, required this.icon});

  final Color color;
  final IconData icon;

  Color get tint => color.withValues(alpha: 0.12);

  static const Map<String, CategoryStyle> _byId = {
    'personal': CategoryStyle(color: Color(0xFF4A4EB0), icon: Icons.person_rounded),
    'home': CategoryStyle(color: Color(0xFF2563EB), icon: Icons.home_rounded),
    'business': CategoryStyle(color: Color(0xFF7C3AED), icon: Icons.storefront_rounded),
    'education': CategoryStyle(color: Color(0xFF0891B2), icon: Icons.school_rounded),
    'vehicle': CategoryStyle(color: Color(0xFFEA580C), icon: Icons.directions_car_rounded),
    'gold': CategoryStyle(color: Color(0xFFC9971F), icon: Icons.workspace_premium_rounded),
  };

  static const _fallback = CategoryStyle(color: Color(0xFF4A4EB0), icon: Icons.account_balance_rounded);

  static CategoryStyle forId(String categoryId) => _byId[categoryId] ?? _fallback;
}
