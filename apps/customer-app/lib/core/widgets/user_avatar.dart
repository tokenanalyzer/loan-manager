import 'package:flutter/material.dart';

/// Circular avatar showing the signed-in user's Google profile photo
/// when one is on file (`UserProfile.photoUrl` — only ever populated
/// for a Google-linked account, see `AuthService.syncFromFirebaseToken`),
/// falling back to initials-on-tint otherwise — never a fake stock
/// photo placeholder. Used on Home and Profile so both stay visually
/// consistent and share the same fallback behavior (including a
/// network-load failure, which falls back to initials rather than a
/// broken-image icon).
class UserAvatar extends StatelessWidget {
  const UserAvatar({
    required this.fullName,
    this.photoUrl,
    this.radius = 22,
    super.key,
  });

  final String? fullName;
  final String? photoUrl;
  final double radius;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final url = photoUrl;

    if (url == null || url.isEmpty) {
      return _InitialsAvatar(fullName: fullName, radius: radius, colorScheme: colorScheme);
    }

    return ClipOval(
      child: Image.network(
        url,
        width: radius * 2,
        height: radius * 2,
        fit: BoxFit.cover,
        errorBuilder: (context, error, stackTrace) =>
            _InitialsAvatar(fullName: fullName, radius: radius, colorScheme: colorScheme),
        loadingBuilder: (context, child, progress) =>
            progress == null ? child : _InitialsAvatar(fullName: fullName, radius: radius, colorScheme: colorScheme),
      ),
    );
  }
}

class _InitialsAvatar extends StatelessWidget {
  const _InitialsAvatar({required this.fullName, required this.radius, required this.colorScheme});

  final String? fullName;
  final double radius;
  final ColorScheme colorScheme;

  static String _initialsFor(String? fullName) {
    if (fullName == null || fullName.trim().isEmpty) return '?';
    final parts = fullName.trim().split(RegExp(r'\s+'));
    final first = parts.first.isNotEmpty ? parts.first[0] : '';
    final last = parts.length > 1 && parts.last.isNotEmpty ? parts.last[0] : '';
    return (first + last).toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    return CircleAvatar(
      radius: radius,
      backgroundColor: colorScheme.primary.withValues(alpha: 0.12),
      child: Text(
        _initialsFor(fullName),
        style: Theme.of(context)
            .textTheme
            .titleMedium
            ?.copyWith(color: colorScheme.primary, fontSize: radius * 0.6),
      ),
    );
  }
}
