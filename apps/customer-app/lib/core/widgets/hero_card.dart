import 'package:flutter/material.dart';
import 'package:shared_flutter/shared_flutter.dart';

/// The one "premium, this-is-the-focal-point" surface on the app —
/// used sparingly (the Home dashboard's Credit Profile + Eligibility
/// card) so it actually reads as more important than the standard
/// [AppCard] surfaces around it, instead of every card competing for
/// the same visual weight.
///
/// Renders a brand-gradient background with a white text theme
/// applied to its subtree, so ordinary `Text`/`Theme.of(context)`
/// widgets placed inside read correctly without each caller
/// hardcoding `Colors.white`.
class HeroCard extends StatefulWidget {
  const HeroCard({
    required this.child,
    this.onTap,
    this.padding = const EdgeInsets.all(20),
    super.key,
  });

  final Widget child;
  final VoidCallback? onTap;
  final EdgeInsetsGeometry padding;

  static const radius = 22.0;

  @override
  State<HeroCard> createState() => _HeroCardState();
}

class _HeroCardState extends State<HeroCard> {
  bool _pressed = false;

  void _setPressed(bool value) {
    if (widget.onTap == null) return;
    setState(() => _pressed = value);
  }

  @override
  Widget build(BuildContext context) {
    final baseTheme = Theme.of(context);
    final whiteTextTheme = baseTheme.textTheme.apply(
      bodyColor: Colors.white,
      displayColor: Colors.white,
    );

    final content = Container(
      width: double.infinity,
      padding: widget.padding,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(HeroCard.radius),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [AppColors.primary, AppColors.primaryDark],
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.28),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Theme(
        data: baseTheme.copyWith(
          textTheme: whiteTextTheme,
          iconTheme: baseTheme.iconTheme.copyWith(color: Colors.white),
        ),
        child: widget.child,
      ),
    );

    if (widget.onTap == null) {
      return content;
    }

    return GestureDetector(
      onTapDown: (_) => _setPressed(true),
      onTapUp: (_) => _setPressed(false),
      onTapCancel: () => _setPressed(false),
      child: AnimatedScale(
        scale: _pressed ? 0.98 : 1,
        duration: const Duration(milliseconds: 100),
        curve: Curves.easeOut,
        child: Material(
          color: Colors.transparent,
          borderRadius: BorderRadius.circular(HeroCard.radius),
          child: InkWell(
            onTap: widget.onTap,
            borderRadius: BorderRadius.circular(HeroCard.radius),
            child: content,
          ),
        ),
      ),
    );
  }
}
