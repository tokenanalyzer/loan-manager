/// Small holder for flags resolved once during `main()`'s bootstrap,
/// before `runApp()`, that the router's `redirect` callback needs to
/// read *synchronously* (go_router redirects can be async, but
/// re-reading SharedPreferences on every navigation is wasteful for a
/// flag that only ever changes once per install).
abstract final class AppBootstrapState {
  static bool hasSeenOnboarding = false;
}
