/// Small holder for flags resolved once during `main()`'s bootstrap,
/// before `runApp()`, that the router's `redirect` callback needs to
/// read *synchronously* (go_router redirects can be async, but
/// re-reading SharedPreferences on every navigation is wasteful for a
/// flag that only ever changes once per install).
abstract final class AppBootstrapState {
  static bool hasSeenOnboarding = false;

  /// Flips to `true` once `kSplashAnimationDuration` has elapsed since
  /// app start (see `main.dart`). The router's `redirect` keeps the
  /// user on `/splash` until this is `true`, regardless of how quickly
  /// Firebase auth resolves — so the branding animation always plays
  /// out in full instead of being cut short by a fast session restore.
  static bool splashMinimumElapsed = false;
}
