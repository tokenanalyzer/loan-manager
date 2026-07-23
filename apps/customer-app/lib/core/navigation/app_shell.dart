import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

/// Persistent bottom-tab shell for the four primary sections (Home,
/// Loans, Documents, Profile) — built on go_router's
/// `StatefulShellRoute.indexedStack` so each tab keeps its own scroll
/// position/local state alive in an `IndexedStack` while switching.
///
/// Every other screen (loan application, profile edit, documents
/// preview, notifications, EMI calculator, support, ...) is a
/// top-level route pushed *above* this shell, not nested inside a
/// branch — so the bottom nav disappears for focused tasks (matching
/// how CRED/PhonePe hide their tab bar mid-flow) and popping one
/// always lands back on the tab it was opened from, for free, via the
/// normal single-Navigator back stack.
class AppShell extends StatelessWidget {
  const AppShell({required this.navigationShell, super.key});

  final StatefulNavigationShell navigationShell;

  static const _destinations = [
    _TabSpec(icon: Icons.home_outlined, selectedIcon: Icons.home_rounded, label: 'Home'),
    _TabSpec(
      icon: Icons.description_outlined,
      selectedIcon: Icons.description_rounded,
      label: 'Loans',
    ),
    _TabSpec(
      icon: Icons.folder_outlined,
      selectedIcon: Icons.folder_rounded,
      label: 'Documents',
    ),
    _TabSpec(icon: Icons.person_outline, selectedIcon: Icons.person_rounded, label: 'Profile'),
  ];

  void _onDestinationSelected(int index) {
    navigationShell.goBranch(
      index,
      // Re-tapping the already-active tab resets it to its root route,
      // instead of doing nothing — standard fintech-app tab behavior.
      initialLocation: index == navigationShell.currentIndex,
    );
  }

  @override
  Widget build(BuildContext context) {
    final isHome = navigationShell.currentIndex == 0;

    return PopScope(
      // Only reachable when this shell page is itself the top of the
      // back stack (any pushed screen above it intercepts back first),
      // so this purely governs "back at a tab root": non-Home tabs
      // return to Home before the app is allowed to exit.
      //
      // Always intercept (`canPop: false`) rather than letting Home's
      // case fall through to go_router's own pop handling — reproduced
      // live on a physical device: an edge back-gesture at the Home tab
      // root crashed with "Null check operator used on a null value" in
      // `GoRouterDelegate._findCurrentNavigator`, which throws when
      // asked to pop with nothing left for *it* to pop. Deciding the
      // "back at root" behavior here and exiting via `SystemNavigator
      // .pop()` directly sidesteps that entirely.
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (didPop) return;
        if (isHome) {
          SystemNavigator.pop();
        } else {
          _onDestinationSelected(0);
        }
      },
      child: Scaffold(
        body: navigationShell,
        bottomNavigationBar: NavigationBar(
          selectedIndex: navigationShell.currentIndex,
          onDestinationSelected: _onDestinationSelected,
          destinations: [
            for (final tab in _destinations)
              NavigationDestination(
                icon: Icon(tab.icon),
                selectedIcon: Icon(tab.selectedIcon),
                label: tab.label,
              ),
          ],
        ),
      ),
    );
  }
}

class _TabSpec {
  const _TabSpec({required this.icon, required this.selectedIcon, required this.label});

  final IconData icon;
  final IconData selectedIcon;
  final String label;
}
