import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Branded page transition (fade + small upward slide) used for every
/// pushed route, so navigating around the app has one consistent,
/// deliberate motion instead of the raw platform default.
CustomTransitionPage<T> fadeThroughPage<T>({
  required LocalKey key,
  required Widget child,
}) {
  return CustomTransitionPage<T>(
    key: key,
    child: child,
    transitionDuration: const Duration(milliseconds: 220),
    reverseTransitionDuration: const Duration(milliseconds: 180),
    transitionsBuilder: (context, animation, secondaryAnimation, child) {
      final curved = CurvedAnimation(parent: animation, curve: Curves.easeOutCubic);
      return FadeTransition(
        opacity: curved,
        child: Transform.translate(
          offset: Offset(0, (1 - curved.value) * 16),
          child: child,
        ),
      );
    },
  );
}
