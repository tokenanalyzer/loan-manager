import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:shared_flutter/shared_flutter.dart';

/// Per-category diagonal brand gradient — the base every illustration
/// in [_CardArtPainter] is painted on top of. Chosen so each category
/// reads as its own "hero color," not a shared brand tint with a
/// different icon.
const _gradientByCategory = <String, List<Color>>{
  'home': [Color(0xFF0B1E45), Color(0xFF1D4ED8), Color(0xFF60A5FA)],
  'vehicle': [Color(0xFF431407), Color(0xFFC2410C), Color(0xFFFB923C)],
  'personal': [Color(0xFF1B1B45), Color(0xFF3730A3), Color(0xFF6366F1)],
  'business': [Color(0xFF2E1065), Color(0xFF7C3AED), Color(0xFFA78BFA)],
  'education': [Color(0xFF083344), Color(0xFF0891B2), Color(0xFF67E8F9)],
  'lap': [Color(0xFF052E1C), Color(0xFF15803D), Color(0xFF4ADE80)],
};

const _fallbackGradient = [Color(0xFF1B1B45), Color(0xFF3730A3), Color(0xFF6366F1)];

List<Color> _gradientFor(String id) => _gradientByCategory[id] ?? _fallbackGradient;

/// Premium fintech-style loan category card — a bespoke, hand-painted
/// vector illustration per category (house, car, growth chart,
/// storefront, graduation cap, apartment tower — see
/// [_CardArtPainter]) standing in for photography, in the CRED/Groww/
/// Apple Card "hero card" idiom. No bundled or network images: every
/// pixel is drawn, so there's nothing to license and nothing to fetch.
///
/// [depth] is how far (in pages, signed) this card currently sits from
/// the carousel's focused page — 0 when centered, up to ±1 while
/// mid-swipe. It drives two things: the illustration nudges sideways
/// for a subtle parallax read as the carousel scrolls, and the whole
/// art layer dims/settles as the card comes into focus. The carousel
/// supplies it frame-by-frame; this widget has no scroll awareness of
/// its own.
class PremiumLoanCard extends StatefulWidget {
  const PremiumLoanCard({
    required this.category,
    required this.child,
    this.onTap,
    this.depth = 0,
    this.padding = const EdgeInsets.all(20),
    super.key,
  });

  final LoanCategory category;
  final Widget child;
  final VoidCallback? onTap;
  final double depth;
  final EdgeInsetsGeometry padding;

  static const radius = 22.0;

  @override
  State<PremiumLoanCard> createState() => _PremiumLoanCardState();
}

class _PremiumLoanCardState extends State<PremiumLoanCard>
    with SingleTickerProviderStateMixin {
  bool _pressed = false;

  // Slow ambient "breathing" glow — cheap (opacity/radius only, no
  // relayout) but is most of what separates a static gradient card
  // from one that feels alive. Runs continuously; the CustomPaint is
  // wrapped in its own RepaintBoundary so this doesn't force the rest
  // of the Home screen to repaint every tick.
  late final AnimationController _shimmer = AnimationController(
    vsync: this,
    duration: const Duration(seconds: 4),
  )..repeat(reverse: true);

  @override
  void dispose() {
    _shimmer.dispose();
    super.dispose();
  }

  void _setPressed(bool value) {
    if (widget.onTap == null) return;
    setState(() => _pressed = value);
  }

  @override
  Widget build(BuildContext context) {
    final gradient = _gradientFor(widget.category.id);
    final baseTheme = Theme.of(context);
    final whiteTextTheme =
        baseTheme.textTheme.apply(bodyColor: Colors.white, displayColor: Colors.white);
    // The art settles into full clarity as its page comes into focus,
    // and fades/softens slightly for neighboring pages mid-swipe —
    // reinforces the zoom the carousel already applies at the widget
    // level, rather than every page reading identically regardless of
    // focus.
    final focus = 1 - widget.depth.abs().clamp(0.0, 1.0) * 0.35;

    final content = ClipRRect(
      borderRadius: BorderRadius.circular(PremiumLoanCard.radius),
      child: Stack(
        fit: StackFit.expand,
        children: [
          RepaintBoundary(
            child: AnimatedBuilder(
              animation: _shimmer,
              builder: (context, _) => Opacity(
                opacity: focus.clamp(0.65, 1.0),
                child: CustomPaint(
                  painter: _CardArtPainter(
                    categoryId: widget.category.id,
                    gradient: gradient,
                    shimmer: _shimmer.value,
                    parallax: widget.depth * 14,
                  ),
                ),
              ),
            ),
          ),
          // Bottom-weighted ~28% black scrim so white text stays
          // readable regardless of how bright the illustration under
          // it is.
          const DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [Colors.transparent, Color(0x47000000)],
                stops: [0.35, 1],
              ),
            ),
          ),
          Padding(
            padding: widget.padding,
            child: Theme(
              data: baseTheme.copyWith(
                textTheme: whiteTextTheme,
                iconTheme: baseTheme.iconTheme.copyWith(color: Colors.white),
              ),
              child: widget.child,
            ),
          ),
        ],
      ),
    );

    final card = Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(PremiumLoanCard.radius),
        boxShadow: [
          BoxShadow(
            color: gradient[1].withValues(alpha: 0.32),
            blurRadius: 24,
            offset: const Offset(0, 12),
          ),
        ],
      ),
      child: content,
    );

    if (widget.onTap == null) return card;

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
          borderRadius: BorderRadius.circular(PremiumLoanCard.radius),
          child: InkWell(
            onTap: widget.onTap,
            borderRadius: BorderRadius.circular(PremiumLoanCard.radius),
            child: card,
          ),
        ),
      ),
    );
  }
}

/// A small frosted-glass badge — genuine [BackdropFilter] blur, unlike
/// the rest of this file's [MaskFilter]-blurred paint tricks. Safe to
/// use for real here because it's tiny and its size never changes
/// (the cost that made a full-card backdrop blur a jank risk doesn't
/// apply to a fixed ~36px chip). Used for the category glyph chip in
/// the card header — one deliberate glassmorphism moment rather than
/// spreading the (comparatively expensive) real blur everywhere.
class GlassBadge extends StatelessWidget {
  const GlassBadge({required this.icon, this.size = 36, super.key});

  final IconData icon;
  final double size;

  @override
  Widget build(BuildContext context) {
    return ClipOval(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 8, sigmaY: 8),
        child: Container(
          width: size,
          height: size,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: Colors.white.withValues(alpha: 0.20),
            border: Border.all(color: Colors.white.withValues(alpha: 0.38)),
          ),
          child: Icon(icon, size: size * 0.5, color: Colors.white),
        ),
      ),
    );
  }
}

/// Hand-painted per-category illustration, layered on the brand
/// gradient: a soft top-left lighting sheen (every category), then one
/// bespoke scene per `categoryId` built from primitive shapes —
/// [Path]s, gradient fills, [MaskFilter]-blurred glows for soft
/// shadows/light, and a couple of "lit window" accents that pick up
/// [shimmer] for a gentle breathing glow. Deliberately abstract rather
/// than attempting photorealism (not achievable by hand-coded vector
/// paths); the goal is the same elegant geometric/lighting language
/// Apple Pay/Apple Card and CRED use for their card art.
class _CardArtPainter extends CustomPainter {
  const _CardArtPainter({
    required this.categoryId,
    required this.gradient,
    required this.shimmer,
    required this.parallax,
  });

  final String categoryId;
  final List<Color> gradient;
  final double shimmer;
  final double parallax;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;

    canvas.drawRect(
      rect,
      Paint()
        ..shader = LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: gradient,
        ).createShader(rect),
    );

    _paintSheen(canvas, size);

    canvas.save();
    canvas.translate(parallax, 0);
    switch (categoryId) {
      case 'home':
        _paintHome(canvas, size);
      case 'vehicle':
        _paintVehicle(canvas, size);
      case 'personal':
        _paintPersonal(canvas, size);
      case 'business':
        _paintBusiness(canvas, size);
      case 'education':
        _paintEducation(canvas, size);
      case 'lap':
        _paintLap(canvas, size);
      default:
        _paintPersonal(canvas, size);
    }
    canvas.restore();
  }

  // ---- shared helpers -----------------------------------------------

  /// Soft glossy highlight top-left, like light catching a card's
  /// surface — the single cheapest trick for making a flat gradient
  /// read as a lit, three-dimensional object instead of a flat color.
  void _paintSheen(Canvas canvas, Size size) {
    final center = Offset(size.width * 0.16, size.height * 0.02);
    final radius = size.width * 0.65;
    canvas.drawRect(
      Offset.zero & size,
      Paint()
        ..shader = RadialGradient(
          colors: [Colors.white.withValues(alpha: 0.20), Colors.white.withValues(alpha: 0)],
        ).createShader(Rect.fromCircle(center: center, radius: radius)),
    );
  }

  void _glow(Canvas canvas, Offset center, double radius, Color color, {double blur = 16}) {
    canvas.drawCircle(
      center,
      radius,
      Paint()
        ..color = color
        ..maskFilter = MaskFilter.blur(BlurStyle.normal, blur),
    );
  }

  void _groundShadow(Canvas canvas, Offset center, double width, double height) {
    canvas.drawOval(
      Rect.fromCenter(center: center, width: width, height: height),
      Paint()
        ..color = Colors.black.withValues(alpha: 0.18)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 9),
    );
  }

  Paint _glassFill(Rect bounds, {double alphaTop = 0.32, double alphaBottom = 0.14}) {
    return Paint()
      ..shader = LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [
          Colors.white.withValues(alpha: alphaTop),
          Colors.white.withValues(alpha: alphaBottom),
        ],
      ).createShader(bounds);
  }

  // ---- home: house with a lit window at dusk -------------------------

  void _paintHome(Canvas canvas, Size size) {
    final baseX = size.width * 0.70;
    final baseY = size.height * 0.88;
    final u = size.height / 190;

    _glow(canvas, Offset(size.width * 0.88, size.height * 0.14), 42 * u, Colors.white.withValues(alpha: 0.12));
    _groundShadow(canvas, Offset(baseX, baseY + 2 * u), 104 * u, 14 * u);

    final bodyRect = Rect.fromLTWH(baseX - 50 * u, baseY - 60 * u, 100 * u, 60 * u);
    canvas.drawRRect(
      RRect.fromRectAndCorners(bodyRect, topLeft: Radius.circular(4 * u), topRight: Radius.circular(4 * u)),
      _glassFill(bodyRect),
    );

    final roofPath = Path()
      ..moveTo(baseX - 62 * u, baseY - 60 * u)
      ..lineTo(baseX, baseY - 102 * u)
      ..lineTo(baseX + 62 * u, baseY - 60 * u)
      ..close();
    canvas.drawPath(roofPath, Paint()..color = Colors.white.withValues(alpha: 0.34));
    canvas.drawLine(
      Offset(baseX, baseY - 102 * u),
      Offset(baseX, baseY - 60 * u),
      Paint()
        ..color = Colors.white.withValues(alpha: 0.5)
        ..strokeWidth = 1.4,
    );

    canvas.drawRect(
      Rect.fromLTWH(baseX + 30 * u, baseY - 96 * u, 10 * u, 22 * u),
      Paint()..color = Colors.white.withValues(alpha: 0.30),
    );

    canvas.drawRRect(
      RRect.fromRectAndCorners(
        Rect.fromLTWH(baseX - 11 * u, baseY - 28 * u, 22 * u, 28 * u),
        topLeft: Radius.circular(6 * u),
        topRight: Radius.circular(6 * u),
      ),
      Paint()..color = Colors.black.withValues(alpha: 0.22),
    );

    final windowRect = Rect.fromLTWH(baseX - 38 * u, baseY - 48 * u, 20 * u, 20 * u);
    final warmth = 0.55 + shimmer * 0.2;
    _glow(canvas, windowRect.center, 18 * u, const Color(0xFFFFE9B8).withValues(alpha: 0.22 + shimmer * 0.08), blur: 10);
    canvas.drawRRect(
      RRect.fromRectAndRadius(windowRect, Radius.circular(3 * u)),
      Paint()..color = const Color(0xFFFFE9B8).withValues(alpha: warmth),
    );
    final mullion = Paint()
      ..color = Colors.black.withValues(alpha: 0.20)
      ..strokeWidth = 1;
    canvas.drawLine(windowRect.centerLeft, windowRect.centerRight, mullion);
    canvas.drawLine(windowRect.topCenter, windowRect.bottomCenter, mullion);
  }

  // ---- vehicle: car silhouette with headlight + speed streaks --------

  void _paintVehicle(Canvas canvas, Size size) {
    final baseX = size.width * 0.66;
    final baseY = size.height * 0.80;
    final u = size.height / 190;

    // Speed streaks, trailing off the back of the car.
    final streak = Paint()
      ..strokeWidth = 3.5 * u
      ..strokeCap = StrokeCap.round
      ..maskFilter = MaskFilter.blur(BlurStyle.normal, 3 * u);
    for (var i = 0; i < 3; i++) {
      final dy = baseY - 26 * u + i * 12 * u;
      final len = 30 * u - i * 6 * u;
      canvas.drawLine(
        Offset(baseX - 58 * u, dy),
        Offset(baseX - 58 * u - len, dy),
        streak..color = Colors.white.withValues(alpha: 0.22 - i * 0.05),
      );
    }

    _groundShadow(canvas, Offset(baseX + 6 * u, baseY + 20 * u), 128 * u, 14 * u);

    final body = Path()
      ..moveTo(baseX - 66 * u, baseY)
      ..lineTo(baseX - 58 * u, baseY - 14 * u)
      ..cubicTo(baseX - 46 * u, baseY - 32 * u, baseX - 24 * u, baseY - 34 * u, baseX - 6 * u, baseY - 34 * u)
      ..cubicTo(baseX + 14 * u, baseY - 34 * u, baseX + 22 * u, baseY - 26 * u, baseX + 34 * u, baseY - 18 * u)
      ..lineTo(baseX + 62 * u, baseY - 12 * u)
      ..cubicTo(baseX + 70 * u, baseY - 10 * u, baseX + 70 * u, baseY, baseX + 62 * u, baseY)
      ..close();
    final bodyBounds = body.getBounds();
    canvas.drawPath(body, _glassFill(bodyBounds, alphaTop: 0.40, alphaBottom: 0.18));
    canvas.drawPath(
      body,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.2
        ..color = Colors.white.withValues(alpha: 0.35),
    );

    // Cabin glass highlight band.
    final glassBand = Path()
      ..moveTo(baseX - 50 * u, baseY - 16 * u)
      ..cubicTo(baseX - 40 * u, baseY - 30 * u, baseX - 22 * u, baseY - 31 * u, baseX - 8 * u, baseY - 31 * u)
      ..lineTo(baseX - 10 * u, baseY - 18 * u)
      ..close();
    canvas.drawPath(glassBand, Paint()..color = Colors.white.withValues(alpha: 0.28));

    // Headlight glow.
    _glow(canvas, Offset(baseX + 60 * u, baseY - 12 * u), 12 * u, const Color(0xFFFFF4D6).withValues(alpha: 0.35 + shimmer * 0.1), blur: 8);
    canvas.drawCircle(Offset(baseX + 60 * u, baseY - 12 * u), 4 * u, Paint()..color = const Color(0xFFFFF4D6));

    // Wheels.
    for (final dx in [-40.0, 38.0]) {
      final wheelCenter = Offset(baseX + dx * u, baseY + 2 * u);
      canvas.drawCircle(wheelCenter, 13 * u, Paint()..color = Colors.black.withValues(alpha: 0.32));
      canvas.drawCircle(wheelCenter, 13 * u, Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1
        ..color = Colors.white.withValues(alpha: 0.3));
      canvas.drawCircle(wheelCenter.translate(-3 * u, -3 * u), 3 * u, Paint()..color = Colors.white.withValues(alpha: 0.25));
    }
  }

  // ---- personal: growth chart + trend line + coins --------------------

  void _paintPersonal(Canvas canvas, Size size) {
    final baseX = size.width * 0.68;
    final baseY = size.height * 0.86;
    final u = size.height / 190;

    _glow(canvas, Offset(size.width * 0.90, size.height * 0.18), 36 * u, Colors.white.withValues(alpha: 0.12));

    final heights = [26.0, 42.0, 34.0, 58.0];
    final barWidth = 16.0 * u;
    final gap = 10.0 * u;
    final points = <Offset>[];
    for (var i = 0; i < heights.length; i++) {
      final h = heights[i] * u;
      final left = baseX - 70 * u + i * (barWidth + gap);
      final rect = Rect.fromLTWH(left, baseY - h, barWidth, h);
      final alpha = 0.20 + i * 0.06;
      canvas.drawRRect(
        RRect.fromRectAndRadius(rect, Radius.circular(4 * u)),
        Paint()..color = Colors.white.withValues(alpha: alpha),
      );
      points.add(Offset(left + barWidth / 2, baseY - h - 6 * u));
    }

    final trend = Path()..moveTo(points.first.dx, points.first.dy);
    for (final p in points.skip(1)) {
      trend.lineTo(p.dx, p.dy);
    }
    canvas.drawPath(
      trend,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2 * u
        ..strokeCap = StrokeCap.round
        ..color = const Color(0xFFFDE68A).withValues(alpha: 0.85),
    );
    final peak = points.last;
    _glow(canvas, peak, 10 * u, const Color(0xFFFDE68A).withValues(alpha: 0.30 + shimmer * 0.12), blur: 8);
    canvas.drawCircle(peak, 3.2 * u, Paint()..color = const Color(0xFFFDE68A));

    // Coin stack, bottom-left of the chart.
    final coinCenter = Offset(baseX - 88 * u, baseY - 2 * u);
    for (var i = 0; i < 3; i++) {
      final c = coinCenter.translate(0, -i * 6.0 * u);
      canvas.drawOval(
        Rect.fromCenter(center: c, width: 34 * u, height: 12 * u),
        Paint()..color = Colors.white.withValues(alpha: 0.24 + i * 0.05),
      );
      canvas.drawOval(
        Rect.fromCenter(center: c, width: 34 * u, height: 12 * u),
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 1
          ..color = Colors.white.withValues(alpha: 0.3),
      );
    }
  }

  // ---- business: storefront with awning + glowing window -------------

  void _paintBusiness(Canvas canvas, Size size) {
    final baseX = size.width * 0.70;
    final baseY = size.height * 0.88;
    final u = size.height / 190;

    _glow(canvas, Offset(size.width * 0.88, size.height * 0.16), 38 * u, Colors.white.withValues(alpha: 0.12));
    _groundShadow(canvas, Offset(baseX, baseY + 2 * u), 108 * u, 14 * u);

    final bodyRect = Rect.fromLTWH(baseX - 52 * u, baseY - 66 * u, 104 * u, 66 * u);
    canvas.drawRRect(RRect.fromRectAndRadius(bodyRect, Radius.circular(4 * u)), _glassFill(bodyRect));

    // Scalloped awning.
    final awningTop = baseY - 66 * u;
    const scallops = 6;
    final scallopW = 104 * u / scallops;
    for (var i = 0; i < scallops; i++) {
      final left = baseX - 52 * u + i * scallopW;
      final scallop = Path()
        ..moveTo(left, awningTop - 12 * u)
        ..lineTo(left + scallopW, awningTop - 12 * u)
        ..lineTo(left + scallopW, awningTop - 2 * u)
        ..arcToPoint(Offset(left, awningTop - 2 * u), radius: Radius.circular(scallopW / 2), clockwise: false)
        ..close();
      canvas.drawPath(scallop, Paint()..color = Colors.white.withValues(alpha: i.isEven ? 0.34 : 0.22));
    }

    // Signage bar.
    canvas.drawRRect(
      RRect.fromRectAndRadius(Rect.fromLTWH(baseX - 40 * u, awningTop - 26 * u, 80 * u, 10 * u), Radius.circular(3 * u)),
      Paint()..color = Colors.white.withValues(alpha: 0.26),
    );

    // Glowing shop window.
    final windowRect = Rect.fromLTWH(baseX - 40 * u, baseY - 40 * u, 52 * u, 34 * u);
    _glow(canvas, windowRect.center, 22 * u, const Color(0xFFFFE9B8).withValues(alpha: 0.16 + shimmer * 0.06), blur: 12);
    canvas.drawRRect(
      RRect.fromRectAndRadius(windowRect, Radius.circular(4 * u)),
      Paint()..color = const Color(0xFFFFE9B8).withValues(alpha: 0.40 + shimmer * 0.1),
    );
    canvas.drawLine(
      windowRect.topCenter,
      windowRect.bottomCenter,
      Paint()
        ..color = Colors.black.withValues(alpha: 0.18)
        ..strokeWidth = 1,
    );

    // Door.
    canvas.drawRRect(
      RRect.fromRectAndCorners(
        Rect.fromLTWH(baseX + 20 * u, baseY - 30 * u, 20 * u, 30 * u),
        topLeft: Radius.circular(5 * u),
        topRight: Radius.circular(5 * u),
      ),
      Paint()..color = Colors.black.withValues(alpha: 0.22),
    );
  }

  // ---- education: graduation cap + open book --------------------------

  void _paintEducation(Canvas canvas, Size size) {
    final baseX = size.width * 0.72;
    final baseY = size.height * 0.60;
    final u = size.height / 190;

    _glow(canvas, Offset(baseX, baseY - 6 * u), 44 * u, Colors.white.withValues(alpha: 0.12 + shimmer * 0.04));

    // Mortarboard.
    final board = Path()
      ..moveTo(baseX, baseY - 34 * u)
      ..lineTo(baseX + 56 * u, baseY - 12 * u)
      ..lineTo(baseX, baseY + 10 * u)
      ..lineTo(baseX - 56 * u, baseY - 12 * u)
      ..close();
    canvas.drawPath(board, Paint()..color = Colors.white.withValues(alpha: 0.34));
    canvas.drawPath(
      board,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1
        ..color = Colors.white.withValues(alpha: 0.4),
    );

    final cap = Rect.fromCenter(center: Offset(baseX, baseY - 2 * u), width: 44 * u, height: 22 * u);
    canvas.drawRRect(RRect.fromRectAndRadius(cap, Radius.circular(6 * u)), _glassFill(cap, alphaTop: 0.30, alphaBottom: 0.16));

    // Tassel.
    final tasselStart = Offset(baseX, baseY - 12 * u);
    final tasselEnd = Offset(baseX + 26 * u, baseY + 22 * u);
    canvas.drawLine(
      tasselStart,
      tasselEnd,
      Paint()
        ..strokeWidth = 1.6 * u
        ..color = const Color(0xFFFDE68A).withValues(alpha: 0.8),
    );
    canvas.drawCircle(tasselEnd, 3.4 * u, Paint()..color = const Color(0xFFFDE68A));

    // Open book beneath.
    final bookY = baseY + 40 * u;
    final leftPage = Path()
      ..moveTo(baseX - 46 * u, bookY)
      ..quadraticBezierTo(baseX - 20 * u, bookY - 12 * u, baseX, bookY)
      ..lineTo(baseX, bookY + 16 * u)
      ..quadraticBezierTo(baseX - 20 * u, bookY + 4 * u, baseX - 46 * u, bookY + 16 * u)
      ..close();
    final rightPage = Path()
      ..moveTo(baseX + 46 * u, bookY)
      ..quadraticBezierTo(baseX + 20 * u, bookY - 12 * u, baseX, bookY)
      ..lineTo(baseX, bookY + 16 * u)
      ..quadraticBezierTo(baseX + 20 * u, bookY + 4 * u, baseX + 46 * u, bookY + 16 * u)
      ..close();
    final bookPaint = Paint()..color = Colors.white.withValues(alpha: 0.26);
    canvas.drawPath(leftPage, bookPaint);
    canvas.drawPath(rightPage, bookPaint);
  }

  // ---- LAP: apartment tower with a grid of lit windows -----------------

  void _paintLap(Canvas canvas, Size size) {
    final baseX = size.width * 0.74;
    final baseY = size.height * 0.90;
    final u = size.height / 190;

    _glow(canvas, Offset(size.width * 0.90, size.height * 0.16), 36 * u, Colors.white.withValues(alpha: 0.12));
    _groundShadow(canvas, Offset(baseX, baseY + 2 * u), 92 * u, 14 * u);

    final towerRect = Rect.fromLTWH(baseX - 44 * u, baseY - 128 * u, 88 * u, 128 * u);
    canvas.drawRRect(
      RRect.fromRectAndCorners(towerRect, topLeft: Radius.circular(6 * u), topRight: Radius.circular(6 * u)),
      _glassFill(towerRect, alphaTop: 0.30, alphaBottom: 0.14),
    );
    // Rooftop ledge.
    canvas.drawRect(
      Rect.fromLTWH(baseX - 48 * u, baseY - 132 * u, 96 * u, 6 * u),
      Paint()..color = Colors.white.withValues(alpha: 0.30),
    );

    const cols = 3;
    const rows = 5;
    final cellW = 88 * u / cols;
    final cellH = 128 * u / rows;
    var seed = 0;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        seed++;
        final lit = seed % 3 != 0;
        final rect = Rect.fromLTWH(
          towerRect.left + c * cellW + cellW * 0.22,
          towerRect.top + r * cellH + cellH * 0.28,
          cellW * 0.56,
          cellH * 0.44,
        );
        final baseAlpha = lit ? 0.55 + shimmer * 0.15 : 0.16;
        canvas.drawRRect(
          RRect.fromRectAndRadius(rect, Radius.circular(1.4 * u)),
          Paint()..color = (lit ? const Color(0xFFFFE9B8) : Colors.white).withValues(alpha: baseAlpha),
        );
      }
    }
  }

  @override
  bool shouldRepaint(covariant _CardArtPainter oldDelegate) =>
      oldDelegate.categoryId != categoryId ||
      oldDelegate.shimmer != shimmer ||
      oldDelegate.parallax != parallax;
}
