import 'package:flutter/material.dart';

import '../models/document.dart';

/// Per-category accent color + icon — same pattern as `CategoryStyle`
/// for loan categories. Deliberately keyed by the 6 fixed
/// `DocumentCategory` values (a closed, stable set), never by
/// individual document *type* — the types within a category are
/// server-driven and open-ended, so nothing here needs to change when
/// a new one is added to the catalog.
class DocumentCategoryStyle {
  const DocumentCategoryStyle({required this.color, required this.icon});

  final Color color;
  final IconData icon;

  Color get tint => color.withValues(alpha: 0.12);

  static const Map<DocumentCategory, DocumentCategoryStyle> _byCategory = {
    DocumentCategory.identity:
        DocumentCategoryStyle(color: Color(0xFF4A4EB0), icon: Icons.badge_rounded),
    DocumentCategory.income:
        DocumentCategoryStyle(color: Color(0xFF0891B2), icon: Icons.payments_rounded),
    DocumentCategory.employment:
        DocumentCategoryStyle(color: Color(0xFF7C3AED), icon: Icons.work_rounded),
    DocumentCategory.balanceTransfer:
        DocumentCategoryStyle(color: Color(0xFFEA580C), icon: Icons.sync_alt_rounded),
    DocumentCategory.loanSpecific:
        DocumentCategoryStyle(color: Color(0xFFC9971F), icon: Icons.workspace_premium_rounded),
    DocumentCategory.other:
        DocumentCategoryStyle(color: Color(0xFF64748B), icon: Icons.folder_rounded),
  };

  static DocumentCategoryStyle forCategory(DocumentCategory category) =>
      _byCategory[category] ?? _byCategory[DocumentCategory.other]!;
}
