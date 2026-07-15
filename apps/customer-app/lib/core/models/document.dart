/// Mirrors the backend's `DocumentResponseDto`.
class AppDocument {
  const AppDocument({
    required this.id,
    required this.documentTypeCode,
    required this.slotIndex,
    required this.originalFileName,
    required this.uploadedAt,
    this.label,
    this.mimeType,
    this.fileSizeBytes,
  });

  final String id;
  final String documentTypeCode;
  final int slotIndex;
  final String? label;
  final String originalFileName;
  final String? mimeType;
  final String? fileSizeBytes;
  final DateTime uploadedAt;

  factory AppDocument.fromJson(Map<String, dynamic> json) {
    return AppDocument(
      id: json['id'] as String,
      documentTypeCode: json['documentTypeCode'] as String,
      slotIndex: json['slotIndex'] as int,
      label: json['label'] as String?,
      originalFileName: json['originalFileName'] as String,
      mimeType: json['mimeType'] as String?,
      fileSizeBytes: json['fileSizeBytes'] as String?,
      uploadedAt: DateTime.parse(json['uploadedAt'] as String),
    );
  }
}

/// One upload slot for a document type — mirrors `DocumentSlotDto`.
class DocumentSlot {
  const DocumentSlot({required this.slotIndex, required this.isUploaded, this.document});

  final int slotIndex;
  final bool isUploaded;
  final AppDocument? document;

  factory DocumentSlot.fromJson(Map<String, dynamic> json) {
    return DocumentSlot(
      slotIndex: json['slotIndex'] as int,
      isUploaded: json['isUploaded'] as bool,
      document: json['document'] != null
          ? AppDocument.fromJson(json['document'] as Map<String, dynamic>)
          : null,
    );
  }
}

/// One document type within a category, with its upload slots —
/// mirrors `DocumentTypeOverviewDto`. Everything the UI needs to
/// render a type (label, required flag, how many slots) comes from
/// this — nothing is hardcoded client-side, so a brand new catalog
/// type (added server-side, no app release) renders correctly the
/// first time it's fetched.
class DocumentTypeOverview {
  const DocumentTypeOverview({
    required this.code,
    required this.label,
    required this.isRequired,
    required this.maxUploads,
    required this.slots,
  });

  final String code;
  final String label;
  final bool isRequired;
  final int maxUploads;
  final List<DocumentSlot> slots;

  bool get isMultiSlot => maxUploads > 1;
  bool get isComplete => slots.every((slot) => slot.isUploaded);
  int get uploadedCount => slots.where((slot) => slot.isUploaded).length;

  factory DocumentTypeOverview.fromJson(Map<String, dynamic> json) {
    return DocumentTypeOverview(
      code: json['code'] as String,
      label: json['label'] as String,
      isRequired: json['isRequired'] as bool,
      maxUploads: json['maxUploads'] as int,
      slots: (json['slots'] as List<dynamic>)
          .map((item) => DocumentSlot.fromJson(item as Map<String, dynamic>))
          .toList(),
    );
  }
}

/// One of the 6 fixed top-level groupings — mirrors the backend's
/// `DocumentCategory` enum. This *is* hardcoded (as a display-order/
/// icon lookup, see `document_category_style.dart`), which is fine:
/// it's a deliberately closed, stable set — the open/extensible part
/// is the document *types* within each category, which are not
/// hardcoded anywhere in this app.
enum DocumentCategory {
  identity,
  income,
  employment,
  balanceTransfer,
  loanSpecific,
  other;

  static DocumentCategory fromJson(String value) => switch (value) {
        'identity' => DocumentCategory.identity,
        'income' => DocumentCategory.income,
        'employment' => DocumentCategory.employment,
        'balance_transfer' => DocumentCategory.balanceTransfer,
        'loan_specific' => DocumentCategory.loanSpecific,
        _ => DocumentCategory.other,
      };

  String get label => switch (this) {
        DocumentCategory.identity => 'Identity',
        DocumentCategory.income => 'Income Documents',
        DocumentCategory.employment => 'Employment Documents',
        DocumentCategory.balanceTransfer => 'Balance Transfer Documents',
        DocumentCategory.loanSpecific => 'Loan-Specific Documents',
        DocumentCategory.other => 'Other Documents',
      };
}

class DocumentCategoryGroup {
  const DocumentCategoryGroup({required this.category, required this.types});

  final DocumentCategory category;
  final List<DocumentTypeOverview> types;

  factory DocumentCategoryGroup.fromJson(Map<String, dynamic> json) {
    return DocumentCategoryGroup(
      category: DocumentCategory.fromJson(json['category'] as String),
      types: (json['types'] as List<dynamic>)
          .map((item) => DocumentTypeOverview.fromJson(item as Map<String, dynamic>))
          .toList(),
    );
  }
}

/// Mirrors `DocumentsOverviewResponseDto` — the full catalog-driven
/// Documents view (`GET /v1/documents[?categoryId=]`).
class DocumentsOverview {
  const DocumentsOverview({required this.categories});

  final List<DocumentCategoryGroup> categories;

  factory DocumentsOverview.fromJson(Map<String, dynamic> json) {
    return DocumentsOverview(
      categories: (json['categories'] as List<dynamic>)
          .map((item) => DocumentCategoryGroup.fromJson(item as Map<String, dynamic>))
          .toList(),
    );
  }
}
