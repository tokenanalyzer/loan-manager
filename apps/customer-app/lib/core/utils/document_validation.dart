import 'dart:io';

/// Client-side pre-upload validation for the Documents feature —
/// mirrors the backend's limits (`MAX_DOCUMENT_FILE_SIZE_BYTES` /
/// `ALLOWED_DOCUMENT_MIME_TYPES` in
/// `apps/backend/src/documents/documents.constants.ts`) so a bad file
/// is rejected instantly with a friendly message instead of only
/// failing after a full upload attempt.
const int kMaxDocumentFileSizeBytes = 10 * 1024 * 1024; // 10 MB

const List<String> kAllowedDocumentExtensions = ['pdf', 'jpg', 'jpeg', 'png'];

/// Returns a friendly error message if [path] fails validation, or
/// `null` if the file is good to upload.
Future<String?> validatePickedFile(String path) async {
  final extension = path.split('.').last.toLowerCase();
  if (!kAllowedDocumentExtensions.contains(extension)) {
    return 'Only PDF, JPG, JPEG, and PNG files are supported.';
  }

  final file = File(path);
  final sizeBytes = await file.length();
  if (sizeBytes > kMaxDocumentFileSizeBytes) {
    final sizeMb = (sizeBytes / (1024 * 1024)).toStringAsFixed(1);
    return 'That file is $sizeMb MB — the maximum allowed size is 10 MB.';
  }

  return null;
}
