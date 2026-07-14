/// Shared formatting helpers — kept dependency-free (no `intl`) so
/// this stays trivial to swap for full ICU-based formatting later
/// (see the Localization section of docs/architecture.md).
///
/// Shared by both the Customer App and Employee App so currency/date
/// display is identical everywhere — previously each app had its own
/// (or, for the Employee App, no) formatter, which is how raw `$`
/// string interpolation leaked into several screens.
abstract final class Formatters {
  /// The backend returns NUMERIC columns as strings (see Phase 3's
  /// note on `numeric`/`decimal` precision) — this renders them with
  /// **Indian digit grouping** (`₹12,34,567.00` — last 3 digits, then
  /// pairs of 2), not Western thousands-grouping, without introducing
  /// floating-point risk.
  static String currency(String amount) {
    final value = double.tryParse(amount);
    if (value == null) return '₹$amount';

    final isNegative = value < 0;
    final fixed = value.abs().toStringAsFixed(2);
    final parts = fixed.split('.');
    final decimalPart = parts[1];

    return '${isNegative ? '-' : ''}₹${_groupIndian(parts[0])}.$decimalPart';
  }

  /// A short "≈ ₹5.00 Lakh" / "≈ ₹1.25 Crore" hint for large amounts —
  /// how Indian users conventionally read big numbers. Returns `null`
  /// for amounts under ₹1,00,000 (no compact form is useful there).
  static String? currencyCompact(String amount) {
    final value = double.tryParse(amount);
    if (value == null) return null;

    final abs = value.abs();
    if (abs >= 1e7) {
      return '≈ ₹${(value / 1e7).toStringAsFixed(2)} Crore';
    }
    if (abs >= 1e5) {
      return '≈ ₹${(value / 1e5).toStringAsFixed(2)} Lakh';
    }
    return null;
  }

  static String _groupIndian(String wholePart) {
    if (wholePart.length <= 3) return wholePart;

    final lastThree = wholePart.substring(wholePart.length - 3);
    var remaining = wholePart.substring(0, wholePart.length - 3);

    final groups = <String>[];
    while (remaining.length > 2) {
      groups.insert(0, remaining.substring(remaining.length - 2));
      remaining = remaining.substring(0, remaining.length - 2);
    }
    if (remaining.isNotEmpty) groups.insert(0, remaining);

    return '${groups.join(',')},$lastThree';
  }

  static String date(DateTime value) {
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return '${value.day} ${months[value.month - 1]} ${value.year}';
  }

  static String dateTime(DateTime value) {
    final hour = value.hour % 12 == 0 ? 12 : value.hour % 12;
    final minute = value.minute.toString().padLeft(2, '0');
    final period = value.hour >= 12 ? 'PM' : 'AM';
    return '${date(value)} · $hour:$minute $period';
  }

  static String relativeTime(DateTime value) {
    final diff = DateTime.now().difference(value);
    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return date(value);
  }
}
