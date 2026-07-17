import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Persistent bottom-tab shell for the four primary staff sections
/// (Home, Customers, Applications, Profile) — built on go_router's
/// `StatefulShellRoute.indexedStack` so each tab keeps its own scroll
/// position/local state alive while switching.
///
/// Detail screens (customer detail, application review) are top-level
/// routes pushed *above* this shell, not nested inside a branch, so
/// the bottom nav disappears for focused review tasks and popping
/// always lands back on the tab it was opened from.
class AppShell extends StatelessWidget {
  const AppShell({required this.navigationShell, super.key});

  final StatefulNavigationShell navigationShell;

  static const _destinations = [
    _TabSpec(icon: Icons.home_outlined, selectedIcon: Icons.home_rounded, label: 'Home'),
    _TabSpec(icon: Icons.people_outline, selectedIcon: Icons.people_rounded, label: 'Customers'),
    _TabSpec(
      icon: Icons.request_page_outlined,
      selectedIcon: Icons.request_page_rounded,
      label: 'Applications',
    ),
    _TabSpec(icon: Icons.person_outline, selectedIcon: Icons.person_rounded, label: 'Profile'),
  ];

  void _onDestinationSelected(int index) {
    navigationShell.goBranch(
      index,
      initialLocation: index == navigationShell.currentIndex,
    );
  }

  @override
  Widget build(BuildContext context) {
    final isHome = navigationShell.currentIndex == 0;

    return PopScope(
      canPop: isHome,
      onPopInvokedWithResult: (didPop, _) {
        if (didPop || isHome) return;
        _onDestinationSelected(0);
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
