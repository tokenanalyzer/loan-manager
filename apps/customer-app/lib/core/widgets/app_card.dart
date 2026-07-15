import 'package:flutter/material.dart';

/// Reusable rounded card — the "premium" surface used throughout the
/// app (dashboard tiles, list items, form sections) so corner radius,
/// elevation, and tap feedback stay consistent in one place.
///
/// Tappable cards get a small press-down scale (in addition to the
/// standard ripple) so the whole app shares one "this responded to my
/// touch" feel instead of every screen inventing its own.
class AppCard extends StatefulWidget {
  const AppCard({
    required this.child,
    this.onTap,
    this.padding = const EdgeInsets.all(16),
    super.key,
  });

  final Widget child;
  final VoidCallback? onTap;
  final EdgeInsetsGeometry padding;

  static const radius = 16.0;

  @override
  State<AppCard> createState() => _AppCardState();
}

class _AppCardState extends State<AppCard> {
  bool _pressed = false;

  void _setPressed(bool value) {
    if (widget.onTap == null) return;
    setState(() => _pressed = value);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final shape = RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(AppCard.radius),
      side: BorderSide(color: theme.dividerColor),
    );

    final card = Card(
      margin: EdgeInsets.zero,
      shape: shape,
      clipBehavior: Clip.antiAlias,
      child: Padding(padding: widget.padding, child: widget.child),
    );

    if (widget.onTap == null) {
      return card;
    }

    return GestureDetector(
      onTapDown: (_) => _setPressed(true),
      onTapUp: (_) => _setPressed(false),
      onTapCancel: () => _setPressed(false),
      child: AnimatedScale(
        scale: _pressed ? 0.98 : 1,
        duration: const Duration(milliseconds: 100),
        curve: Curves.easeOut,
        child: InkWell(
          onTap: widget.onTap,
          borderRadius: BorderRadius.circular(AppCard.radius),
          child: card,
        ),
      ),
    );
  }
}
