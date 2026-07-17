import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:pdfx/pdfx.dart';
import 'package:shared_flutter/shared_flutter.dart';

import '../../core/models/document.dart';
import '../../core/riverpod/providers.dart';
import '../../core/widgets/state_views.dart';

/// Read-only, in-app preview of a single customer document for staff
/// review — images render with pinch-to-zoom, PDFs with `pdfx`'s
/// pinch-zoomable viewer. Mirrors the Customer App's preview screen,
/// against the staff-only content endpoint
/// (`DocumentRepository.fetchContent`).
class DocumentPreviewScreen extends ConsumerWidget {
  const DocumentPreviewScreen({required this.document, super.key});

  final AppDocument document;

  bool get _isPdf =>
      document.mimeType == 'application/pdf' ||
      document.originalFileName.toLowerCase().endsWith('.pdf');

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final documentRepository = ref.watch(documentRepositoryProvider);

    return Scaffold(
      appBar: AppBar(title: Text(document.originalFileName)),
      body: FutureBuilder<ApiResult<Uint8List>>(
        future: documentRepository.fetchContent(document.id),
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const LoadingView();
          }

          final result = snapshot.data;
          if (result == null) {
            return const ErrorView(
                message: 'Something went wrong. Please try again.');
          }

          return result.when(
            failure: (error) => ErrorView(message: error.message),
            success: (bytes) =>
                _isPdf ? _PdfPreview(bytes: bytes) : _ImagePreview(bytes: bytes),
          );
        },
      ),
    );
  }
}

class _ImagePreview extends StatelessWidget {
  const _ImagePreview({required this.bytes});

  final Uint8List bytes;

  @override
  Widget build(BuildContext context) {
    return PhotoView(
      imageProvider: MemoryImage(bytes),
      backgroundDecoration:
          BoxDecoration(color: Theme.of(context).scaffoldBackgroundColor),
      errorBuilder: (context, error, stackTrace) => const _UnsupportedFileView(),
    );
  }
}

class _PdfPreview extends StatefulWidget {
  const _PdfPreview({required this.bytes});

  final Uint8List bytes;

  @override
  State<_PdfPreview> createState() => _PdfPreviewState();
}

class _PdfPreviewState extends State<_PdfPreview> {
  late final _controller =
      PdfControllerPinch(document: PdfDocument.openData(widget.bytes));
  bool _failed = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_failed) return const _UnsupportedFileView();

    return PdfViewPinch(
      controller: _controller,
      onDocumentError: (error) => setState(() => _failed = true),
    );
  }
}

class _UnsupportedFileView extends StatelessWidget {
  const _UnsupportedFileView();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.insert_drive_file_outlined, size: 64),
            const SizedBox(height: 12),
            Text(
              "This file type can't be previewed here yet.",
              style: Theme.of(context).textTheme.bodyMedium,
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
