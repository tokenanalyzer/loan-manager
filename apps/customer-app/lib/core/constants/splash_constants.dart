/// Total duration of the animated splash screen (`SplashScreen`) —
/// shared with `main.dart`'s minimum-display timer and the router's
/// redirect gate (`AppBootstrapState.splashMinimumElapsed`) so the
/// branding animation always finishes before navigating away, even
/// when Firebase auth resolves almost instantly.
const kSplashAnimationDuration = Duration(milliseconds: 2300);
