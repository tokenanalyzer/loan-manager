/// Shared formatting helpers — kept dependency-free (no `intl`) so
/// this stays trivial to swap for full ICU-based formatting later
/// (see the Localization section of docs/architecture.md).
abstract final class Formatters {
  /// The backend returns NUMERIC columns as strings (see Phase 3's
  /// note on `numeric`/`decimal` precision) — this renders them with
  /// thousands separators without introducing floating-point risk.
  static String currency(String amount) {
    final value = double.tryParse(amount);
    if (value == null) return '\$$amount';

    final isNegative = value < 0;
    final fixed = value.abs().toStringAsFixed(2);
    final parts = fixed.split('.');
    final wholePart = parts[0];
    final decimalPart = parts[1];

    final buffer = StringBuffer();
    for (var i = 0; i < wholePart.length; i++) {
      if (i > 0 && (wholePart.length - i) % 3 == 0) {
        buffer.write(',');
      }
      buffer.write(wholePart[i]);
    }

    return '${isNegative ? '-' : ''}\$$buffer.$decimalPart';
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
    return '${months[value.month - 1]} ${value.day}, ${value.year}';
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
