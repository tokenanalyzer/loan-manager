import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:pdfx/pdfx.dart';
import 'package:shared_flutter/shared_flutter.dart';

import '../../core/models/document.dart';
import '../../core/riverpod/providers.dart';
import '../../core/utils/friendly_error.dart';
import '../../core/widgets/state_views.dart';

/// Previews a single uploaded document in-app — never forces the user
/// out to a browser or external app. Images render with pinch-to-zoom
/// (`photo_view`, bundled with `pdfx`); PDFs render with `pdfx`'s
/// pinch-zoomable `PdfViewPinch`. Both fetch bytes through
/// `DocumentRepository.fetchContent`, which goes through the shared
/// `ApiClient` (auth header attached automatically), rather than a raw
/// `Image.network` call managing its own Firebase token.
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
            failure: (error) => ErrorView(message: friendlyMessage(error)),
            success: (bytes) => _isPdf
                ? _PdfPreview(bytes: bytes)
                : _ImagePreview(bytes: bytes),
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
      errorBuilder: (context, error, stackTrace) =>
          const _UnsupportedFileView(),
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
