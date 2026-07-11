import 'package:flutter/material.dart';

/// Shared color palette used by both the Customer App and Employee App.
///
/// Phase 2 scope: base brand/semantic colors only. Feature-specific
/// colors (status badges, charts, etc.) will be added alongside the
/// features that need them.
abstract final class AppColors {
  static const Color primary = Color(0xFF1A56DB);
  static const Color primaryDark = Color(0xFF12409E);
  static const Color secondary = Color(0xFF0E9F6E);

  static const Color background = Color(0xFFF9FAFB);
  static const Color surface = Color(0xFFFFFFFF);

  static const Color textPrimary = Color(0xFF111827);
  static const Color textSecondary = Color(0xFF6B7280);

  static const Color success = Color(0xFF0E9F6E);
  static const Color warning = Color(0xFFF59E0B);
  static const Color error = Color(0xFFE02424);

  static const Color backgroundDark = Color(0xFF111827);
  static const Color surfaceDark = Color(0xFF1F2937);
}
