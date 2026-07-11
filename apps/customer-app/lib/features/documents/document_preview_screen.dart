import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/config/env_config.dart';
import '../../core/riverpod/providers.dart';
import '../../core/widgets/state_views.dart';

/// Previews a single uploaded document. Images render inline (fetched
/// with a fresh Firebase ID token, since the content endpoint requires
/// auth); other file types show a generic file card, since an in-app
/// PDF/document viewer is future work.
class DocumentPreviewScreen extends ConsumerWidget {
  const DocumentPreviewScreen({required this.documentId, super.key});

  final String documentId;

  Future<Map<String, String>> _authHeaders() async {
    if (!EnvConfig.firebaseEnabled) return {};
    final token = await FirebaseAuth.instance.currentUser?.getIdToken();
    return token != null ? {'Authorization': 'Bearer $token'} : {};
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final documentRepository = ref.watch(documentRepositoryProvider);
    final url = documentRepository.contentUrl(documentId);

    return Scaffold(
      appBar: AppBar(title: const Text('Document')),
      body: FutureBuilder<Map<String, String>>(
        future: _authHeaders(),
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const LoadingView();
          }

          return Center(
            child: InteractiveViewer(
              child: Image.network(
                url,
                headers: snapshot.data,
                errorBuilder: (context, error, stackTrace) => Padding(
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
              ),
            ),
          );
        },
      ),
    );
  }
}
