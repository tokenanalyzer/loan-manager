import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:shared_flutter/shared_flutter.dart';

import '../../core/constants/splash_constants.dart';

/// Shown while the app is resolving whether a Firebase session can be
/// restored (`AuthState.AuthInitial`/`AuthSyncing`), and — via the
/// router's `AppBootstrapState.splashMinimumElapsed` gate — for at
/// least `kSplashAnimationDuration` regardless of how fast that
/// resolves, so the branding animation always plays in full instead of
/// being cut short. Lands on Home (session restored) or the login flow
/// (no session) once both the animation and auth resolution are done —
/// see `app_router.dart`'s redirect.
///
/// The icon (`app_icon.png`) is static — same file, same size/position
/// as the native pre-Flutter splash (see pubspec.yaml's
/// `flutter_native_splash` config) — so native-to-Flutter handoff is
/// one continuous screen, not two. Only the wordmark/divider/tagline
/// below it animate in.
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  static const _titleColor = Color(0xFF0A1130);
  static const _accentBlue = Color(0xFF3473F9);
  static const _taglineColor = Color(0xFF5A6B99);

  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: kSplashAnimationDuration,
  )..forward();

  late final Animation<double> _titleOpacity = CurvedAnimation(
    parent: _controller,
    curve: const Interval(0.08, 0.32, curve: Curves.easeOut),
  );

  late final Animation<double> _titleSlide = Tween(begin: 8.0, end: 0.0)
      .animate(CurvedAnimation(
    parent: _controller,
    curve: const Interval(0.08, 0.32, curve: Curves.easeOut),
  ));

  late final Animation<double> _dividerGrow = CurvedAnimation(
    parent: _controller,
    curve: const Interval(0.28, 0.42, curve: Curves.easeOut),
  );

  // Capped at 58% opacity — visible but never competing with the title.
  late final Animation<double> _taglineOpacity = Tween(begin: 0.0, end: 0.58)
      .animate(CurvedAnimation(
    parent: _controller,
    curve: const Interval(0.38, 0.58, curve: Curves.easeOut),
  ));

  late final Animation<double> _taglineSlide = Tween(begin: 6.0, end: 0.0)
      .animate(CurvedAnimation(
    parent: _controller,
    curve: const Interval(0.38, 0.58, curve: Curves.easeOut),
  ));

  late final Animation<double> _waveReveal = CurvedAnimation(
    parent: _controller,
    curve: const Interval(0.45, 0.85, curve: Curves.easeOut),
  );

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: LayoutBuilder(
        builder: (context, constraints) {
          final h = constraints.maxHeight;
          return AnimatedBuilder(
            animation: _controller,
            builder: (context, _) => Stack(
              children: [
                Positioned(
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: h * 0.20,
                  child: Opacity(
                    opacity: _waveReveal.value,
                    child: CustomPaint(
                      size: Size.infinite,
                      painter: _WaveDotPainter(reveal: _waveReveal.value),
                    ),
                  ),
                ),
                Positioned(
                  top: h * 0.24,
                  left: 0,
                  right: 0,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Static — identical to the native splash icon,
                      // never faded/scaled, so nothing pops at handoff.
                      Image.asset(
                        'assets/branding/app_icon.png',
                        width: 200,
                        height: 200,
                        fit: BoxFit.contain,
                        filterQuality: FilterQuality.high,
                      ),
                      SizedBox(height: h * 0.028),
                      Opacity(
                        opacity: _titleOpacity.value,
                        child: Transform.translate(
                          offset: Offset(0, _titleSlide.value),
                          child: const Text(
                            'Loan Manager',
                            style: TextStyle(
                              fontFamily: AppTextStyles.fontFamily,
                              fontSize: 32,
                              fontWeight: FontWeight.w700,
                              color: _titleColor,
                              letterSpacing: 0.1,
                            ),
                          ),
                        ),
                      ),
                      SizedBox(height: h * 0.012),
                      _buildDivider(),
                      SizedBox(height: h * 0.016),
                      Opacity(
                        opacity: _taglineOpacity.value,
                        child: Transform.translate(
                          offset: Offset(0, _taglineSlide.value),
                          child: const Text(
                            'FAST  •  SECURE  •  TRUSTED',
                            style: TextStyle(
                              fontFamily: AppTextStyles.fontFamily,
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                              color: _taglineColor,
                              letterSpacing: 2.4,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildDivider() {
    return Opacity(
      opacity: _dividerGrow.value,
      child: Align(
        child: Container(
          width: 40 * _dividerGrow.value,
          height: 3,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(1.5),
            gradient: LinearGradient(
              colors: [
                _accentBlue.withValues(alpha: 0.0),
                _accentBlue.withValues(alpha: 0.85),
                _accentBlue.withValues(alpha: 0.0),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Faint topographic dot-wave, anchored to the bottom of the screen —
/// a purely decorative widget-drawn texture (no image asset).
class _WaveDotPainter extends CustomPainter {
  const _WaveDotPainter({required this.reveal});

  final double reveal;

  @override
  void paint(Canvas canvas, Size size) {
    const rows = 14;
    for (var r = 0; r < rows; r++) {
      final rowT = r / (rows - 1);
      final y = size.height * rowT;
      final amplitude = 8.0 + rowT * 16.0;
      final freq = 1.4 + rowT * 0.35;
      final spacing = 12.0 - rowT * 3.0;
      final opacity = (0.015 + rowT * 0.055) * reveal;
      if (opacity <= 0) continue;
      final color = Color.lerp(
        const Color(0xFFBFD3FF),
        const Color(0xFF6D93FF),
        rowT,
      )!
          .withValues(alpha: opacity);
      final paint = Paint()..color = color;
      for (var x = 0.0; x <= size.width; x += spacing) {
        final dy =
            y + math.sin((x / size.width) * math.pi * freq + rowT * 2) * amplitude;
        if (dy < 0 || dy > size.height) continue;
        canvas.drawCircle(Offset(x, dy), 1.1, paint);
      }
    }
  }

  @override
  bool shouldRepaint(covariant _WaveDotPainter oldDelegate) =>
      oldDelegate.reveal != reveal;
}
