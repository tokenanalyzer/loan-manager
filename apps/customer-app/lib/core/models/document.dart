/// Mirrors the backend's `DocumentResponseDto`.
class AppDocument {
  const AppDocument({
    required this.id,
    required this.documentType,
    required this.originalFileName,
    required this.uploadedAt,
    this.mimeType,
    this.fileSizeBytes,
  });

  final String id;
  final String documentType;
  final String originalFileName;
  final String? mimeType;
  final String? fileSizeBytes;
  final DateTime uploadedAt;

  factory AppDocument.fromJson(Map<String, dynamic> json) {
    return AppDocument(
      id: json['id'] as String,
      documentType: json['documentType'] as String,
      originalFileName: json['originalFileName'] as String,
      mimeType: json['mimeType'] as String?,
      fileSizeBytes: json['fileSizeBytes'] as String?,
      uploadedAt: DateTime.parse(json['uploadedAt'] as String),
    );
  }
}

/// Mirrors the backend's `RequiredDocumentStatusDto`.
class RequiredDocumentStatus {
  const RequiredDocumentStatus({
    required this.documentType,
    required this.label,
    required this.isUploaded,
    this.document,
  });

  final String documentType;
  final String label;
  final bool isUploaded;
  final AppDocument? document;

  factory RequiredDocumentStatus.fromJson(Map<String, dynamic> json) {
    return RequiredDocumentStatus(
      documentType: json['documentType'] as String,
      label: json['label'] as String,
      isUploaded: json['isUploaded'] as bool,
      document: json['document'] != null
          ? AppDocument.fromJson(json['document'] as Map<String, dynamic>)
          : null,
    );
  }
}

class DocumentsOverview {
  const DocumentsOverview({required this.required, required this.documents});

  final List<RequiredDocumentStatus> required;
  final List<AppDocument> documents;

  factory DocumentsOverview.fromJson(Map<String, dynamic> json) {
    return DocumentsOverview(
      required: (json['required'] as List<dynamic>)
          .map((item) => RequiredDocumentStatus.fromJson(item as Map<String, dynamic>))
          .toList(),
      documents: (json['documents'] as List<dynamic>)
          .map((item) => AppDocument.fromJson(item as Map<String, dynamic>))
          .toList(),
    );
  }
}
