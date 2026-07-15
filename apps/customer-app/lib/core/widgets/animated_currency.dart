import 'package:flutter/material.dart';
import 'package:shared_flutter/shared_flutter.dart';

/// Counts up from 0 to [value] on first build, formatted through the
/// same [Formatters.currency] every other screen uses — so the
/// "premium" count-up moment never invents its own currency
/// formatting rules.
class AnimatedCurrency extends StatelessWidget {
  const AnimatedCurrency({
    required this.value,
    this.style,
    this.duration = const Duration(milliseconds: 900),
    super.key,
  });

  final double value;
  final TextStyle? style;
  final Duration duration;

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: value),
      duration: duration,
      curve: Curves.easeOutCubic,
      builder: (context, animatedValue, _) {
        return Text(
          Formatters.currency(animatedValue.toStringAsFixed(2)),
          style: style,
        );
      },
    );
  }
}
