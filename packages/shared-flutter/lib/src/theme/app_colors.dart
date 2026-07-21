import 'package:flutter/material.dart';

/// Shared color palette used by both the Customer App and Employee App.
///
/// Deep indigo (trust, financial-services convention) + a warm gold
/// accent (reads premium/Indian rather than a generic Material-blue
/// sample) — chosen to read as a deliberate brand, not a
/// `ColorScheme.fromSeed` default. The gold accent is a cosmetic
/// color token only — unrelated to any loan product/category.
abstract final class AppColors {
  static const Color primary = Color(0xFF2B2E7A);
  static const Color primaryDark = Color(0xFF1C1E52);
  static const Color primaryLight = Color(0xFF4A4EB0);

  /// Warm gold accent — used sparingly for premium touches (offer
  /// ribbons, KYC/eligibility highlights), never as a semantic status
  /// color (that's `warning`, kept distinct on purpose).
  static const Color accentGold = Color(0xFFC9971F);
  static const Color accentGoldLight = Color(0xFFF4E4BC);

  static const Color secondary = Color(0xFF0E9F6E);

  static const Color background = Color(0xFFF6F7FB);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color surfaceElevated = Color(0xFFFFFFFF);
  static const Color border = Color(0xFFE5E7EF);

  static const Color textPrimary = Color(0xFF14162E);
  static const Color textSecondary = Color(0xFF666B85);
  static const Color textTertiary = Color(0xFF9498AD);

  static const Color success = Color(0xFF0E9F6E);
  static const Color warning = Color(0xFFF59E0B);
  static const Color error = Color(0xFFDC2626);

  static const Color backgroundDark = Color(0xFF0F1123);
  static const Color surfaceDark = Color(0xFF1A1D3A);
  static const Color surfaceElevatedDark = Color(0xFF23264A);
  static const Color borderDark = Color(0xFF32355C);
}
