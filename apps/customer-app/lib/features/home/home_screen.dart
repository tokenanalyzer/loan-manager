import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:shared_flutter/shared_flutter.dart';

import '../../core/constants/category_style.dart';
import '../../core/models/document.dart';
import '../../core/models/lending_partner.dart';
import '../../core/utils/friendly_error.dart';
import '../../core/widgets/animated_currency.dart';
import '../../core/widgets/app_card.dart';
import '../../core/widgets/fade_slide_in.dart';
import '../../core/widgets/premium_loan_card.dart';
import '../../core/widgets/section_header.dart';
import '../../core/widgets/skeleton_loader.dart';
import '../../core/widgets/state_views.dart';
import '../../core/widgets/user_avatar.dart';
import '../documents/documents_controller.dart';
import 'home_controller.dart';
import 'lending_partners_provider.dart';

/// The Home dashboard — the app's first impression. Every section
/// below is built from real data (or simply not rendered if that data
/// doesn't exist yet) — no placeholder numbers, no "Environment:
/// development" text, no repeated content across sections.
///
/// Deliberately dense above the fold: Credit Profile, Loan
/// Eligibility, Active Applications, EMI Summary, Recent Activity, and
/// Quick Apply all read in the first viewport on a real phone — see
/// the compact hero card + stat-strip layout below, instead of one
/// full-width card per fact.
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashboardAsync = ref.watch(homeControllerProvider);

    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () => ref.read(homeControllerProvider.notifier).refresh(),
          child: dashboardAsync.when(
            loading: () => ListView(
              padding: const EdgeInsets.all(16),
              children: const [
                SkeletonCard(lines: 2),
                SizedBox(height: 16),
                SkeletonCard(),
                SizedBox(height: 16),
                SkeletonCard(),
              ],
            ),
            error: (error, _) => ErrorView(
              message: friendlyMessage(error),
              onRetry: () => ref.invalidate(homeControllerProvider),
            ),
            data: (data) => _DashboardContent(data: data),
          ),
        ),
      ),
    );
  }
}

class _DashboardContent extends ConsumerWidget {
  const _DashboardContent({required this.data});

  final HomeDashboardData data;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final offers = data.eligibilityOffers;
    final documentsAsync = ref.watch(documentsOverviewProvider(null));
    final recentDocuments = documentsAsync.valueOrNull?.categories
            .expand((group) => group.types)
            .expand((type) => type.slots)
            .map((slot) => slot.document)
            .whereType<AppDocument>()
            .toList() ??
        <AppDocument>[];
    recentDocuments.sort((a, b) => b.uploadedAt.compareTo(a.uploadedAt));
    final topRecentDocuments = recentDocuments.take(3).toList();

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      children: [
        _Header(data: data),
        const SizedBox(height: 16),
        FadeSlideIn(
          child: _LoanCategoryHero(data: data),
        ),
        const SizedBox(height: 14),
        FadeSlideIn(
          delay: const Duration(milliseconds: 60),
          child: _OverviewStatRow(data: data, documentsAsync: documentsAsync),
        ),
        const SizedBox(height: 22),
        FadeSlideIn(
          delay: const Duration(milliseconds: 110),
          child: _QuickApplyRow(),
        ),
        if (data.recentActivity.isNotEmpty) ...[
          const SizedBox(height: 22),
          FadeSlideIn(
            delay: const Duration(milliseconds: 160),
            child: _RecentActivitySection(data: data),
          ),
        ],
        if (offers.isNotEmpty) ...[
          const SizedBox(height: 22),
          FadeSlideIn(
            delay: const Duration(milliseconds: 200),
            child: _LoansForYouSection(offers: offers),
          ),
        ],
        if (topRecentDocuments.isNotEmpty) ...[
          const SizedBox(height: 22),
          FadeSlideIn(
            delay: const Duration(milliseconds: 220),
            child: _RecentDocumentsSection(documents: topRecentDocuments),
          ),
        ],
        const SizedBox(height: 22),
        FadeSlideIn(
          delay: const Duration(milliseconds: 240),
          child: _LendingPartnersSection(),
        ),
      ],
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.data});

  final HomeDashboardData data;

  String get _greeting {
    final hour = DateTime.now().hour;
    final period = hour < 12
        ? 'morning'
        : hour < 17
            ? 'afternoon'
            : 'evening';
    final name = data.userProfile?.fullName;
    final firstName = (name != null && name.isNotEmpty) ? name.split(' ').first : null;
    return firstName != null
        ? 'Good $period, $firstName'
        : 'Good $period';
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final colorScheme = Theme.of(context).colorScheme;

    return Row(
      children: [
        GestureDetector(
          onTap: () => context.go('/profile'),
          child: UserAvatar(
            fullName: data.userProfile?.fullName,
            photoUrl: data.userProfile?.photoUrl,
            radius: 22,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Text(_greeting, style: textTheme.headlineMedium),
        ),
        Stack(
          clipBehavior: Clip.none,
          children: [
            IconButton(
              icon: const Icon(Icons.notifications_outlined),
              tooltip: 'Notifications',
              onPressed: () => context.push('/notifications'),
            ),
            if (data.unreadNotificationCount > 0)
              Positioned(
                right: 6,
                top: 6,
                child: Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: colorScheme.error,
                    shape: BoxShape.circle,
                  ),
                ),
              ),
          ],
        ),
      ],
    );
  }
}

/// Rotating carousel through every enabled loan category
/// (`kLoanCategories` — the catalog itself is what's "enabled"), each
/// page its own premium [PremiumLoanCard] with per-category artwork
/// and that category's own eligible amount — informative, not a
/// generic promo banner. Auto-advances every 4 seconds; manual swipes
/// reset the timer's starting point rather than fighting it. Credit
/// Profile (shown here previously) moved into the stat row below
/// (`_OverviewStatRow`) so no information was lost.
///
/// The focused page renders at full scale; neighbors shrink slightly
/// as they scroll past (driven by [PageController.page] via
/// `AnimatedBuilder`) for a subtle zoom/parallax depth effect —
/// [PremiumLoanCard.depth] also nudges its background art the
/// opposite way so the art appears to drift under the text.
class _LoanCategoryHero extends StatefulWidget {
  const _LoanCategoryHero({required this.data});

  final HomeDashboardData data;

  @override
  State<_LoanCategoryHero> createState() => _LoanCategoryHeroState();
}

class _LoanCategoryHeroState extends State<_LoanCategoryHero> {
  final _pageController = PageController();
  Timer? _timer;
  int _currentPage = 0;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 4), (_) {
      if (!_pageController.hasClients) return;
      final next = (_currentPage + 1) % kLoanCategories.length;
      _pageController.animateToPage(
        next,
        duration: const Duration(milliseconds: 500),
        curve: Curves.easeInOut,
      );
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _pageController.dispose();
    super.dispose();
  }

  double _pageOf(int fallback) {
    if (_pageController.hasClients && _pageController.position.haveDimensions) {
      return _pageController.page ?? fallback.toDouble();
    }
    return fallback.toDouble();
  }

  @override
  Widget build(BuildContext context) {
    final eligibility = widget.data.eligibilityByCategory;
    final colorScheme = Theme.of(context).colorScheme;

    return Column(
      children: [
        SizedBox(
          // Confirmed via a real-device run: 112 overflowed by 17px
          // once real content (icon row + eligible-amount block +
          // 2-line description) rendered at that device's actual font
          // scale — 192 clears it with a safety margin for other
          // devices/accessibility text-scale settings, plus room for
          // the taller full-bleed art card.
          height: 192,
          child: PageView.builder(
            controller: _pageController,
            itemCount: kLoanCategories.length,
            onPageChanged: (index) => setState(() => _currentPage = index),
            itemBuilder: (context, index) {
              final category = kLoanCategories[index];
              return AnimatedBuilder(
                animation: _pageController,
                builder: (context, child) {
                  final distance = (_pageOf(_currentPage) - index).clamp(-1.0, 1.0);
                  return Transform.scale(
                    scale: 1 - distance.abs() * 0.06,
                    child: child,
                  );
                },
                child: PremiumLoanCard(
                  category: category,
                  onTap: () => context.push('/loans/apply?categoryId=${category.id}'),
                  child: _HeroCategoryContent(
                    category: category,
                    eligibleAmount: eligibility[category.id],
                  ),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 12),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            for (var i = 0; i < kLoanCategories.length; i++)
              AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                margin: const EdgeInsets.symmetric(horizontal: 3),
                width: i == _currentPage ? 16 : 6,
                height: 6,
                decoration: BoxDecoration(
                  color: colorScheme.primary.withValues(alpha: i == _currentPage ? 0.9 : 0.25),
                  borderRadius: BorderRadius.circular(3),
                ),
              ),
          ],
        ),
      ],
    );
  }
}

class _HeroCategoryContent extends StatelessWidget {
  const _HeroCategoryContent({required this.category, required this.eligibleAmount});

  final LoanCategory category;
  final double? eligibleAmount;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final style = CategoryStyle.forId(category.id);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            GlassBadge(icon: style.icon),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                category.title,
                style: textTheme.titleMedium?.copyWith(color: Colors.white),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        if (eligibleAmount != null) ...[
          Row(
            children: [
              Text('Eligible up to',
                  style: textTheme.labelMedium?.copyWith(color: Colors.white70)),
              const SizedBox(width: 4),
              GestureDetector(
                onTap: () => _showEligibilityExplanation(context),
                child: const Icon(Icons.info_outline, size: 14, color: Colors.white70),
              ),
            ],
          ),
          const SizedBox(height: 4),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: AnimatedCurrency(
              value: eligibleAmount!,
              style: textTheme.titleLarge?.copyWith(color: Colors.white),
            ),
          ),
        ] else
          Text(
            'Add your income to see your eligibility',
            style: textTheme.bodyMedium?.copyWith(color: Colors.white),
          ),
        const SizedBox(height: 6),
        // Constrained to roughly the left two-thirds of the card,
        // rather than the full width Text would otherwise wrap to —
        // the illustration lives in the right third (see
        // PremiumLoanCard/_CardArtPainter), and a full-width 2-line
        // description would run straight through it on longer
        // category descriptions.
        FractionallySizedBox(
          widthFactor: 0.66,
          alignment: Alignment.centerLeft,
          child: Text(
            category.description,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: textTheme.bodySmall?.copyWith(color: Colors.white70),
          ),
        ),
      ],
    );
  }
}

void _showCreditTips(BuildContext context) {
  showModalBottomSheet<void>(
    context: context,
    showDragHandle: true,
    builder: (context) => Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Strengthen your credit profile', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 12),
          const _TipRow(text: 'Keep your KYC (PAN + Aadhaar) verified and up to date.'),
          const _TipRow(text: 'Upload all required documents before you apply.'),
          const _TipRow(text: 'Keep declared income and existing EMIs accurate — lenders '
              'cross-check these during review.'),
          const _TipRow(
              text: 'Pay existing EMIs and credit card bills on time — repayment history '
                  'matters most for approval.'),
        ],
      ),
    ),
  );
}

void _showEligibilityExplanation(BuildContext context) {
  showModalBottomSheet<void>(
    context: context,
    showDragHandle: true,
    builder: (context) => Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('How we estimate this', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 12),
          Text(
            'Your eligible amount is estimated from your declared monthly income, minus '
            'any existing EMI obligations you\'ve told us about, over the loan category\'s '
            'typical tenure and interest rate. It\'s an indicative estimate, not a '
            'guaranteed offer — your actual eligibility is confirmed during application '
            'review.',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
        ],
      ),
    ),
  );
}

class _TipRow extends StatelessWidget {
  const _TipRow({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.check_circle_outline, size: 18, color: Theme.of(context).colorScheme.primary),
          const SizedBox(width: 10),
          Expanded(child: Text(text, style: Theme.of(context).textTheme.bodyMedium)),
        ],
      ),
    );
  }
}

/// Compact two-up stat row for Active Applications + EMI Summary — a
/// slim strip rather than one full card per fact, so both are visible
/// above the fold alongside everything else.
class _OverviewStatRow extends StatelessWidget {
  const _OverviewStatRow({required this.data, required this.documentsAsync});

  final HomeDashboardData data;
  final AsyncValue<DocumentsOverview> documentsAsync;

  @override
  Widget build(BuildContext context) {
    final active = data.activeApplications;
    final activeTotal =
        active.fold<double>(0, (sum, app) => sum + (double.tryParse(app.requestedAmount) ?? 0));
    final nextMaturity = data.nextMaturityDate;
    final overview = documentsAsync.valueOrNull;
    final missingDocs = overview != null
        ? overview.requiredSummary.total - overview.requiredSummary.satisfied
        : 0;
    final activeCaption = active.isEmpty
        ? null
        : (missingDocs > 0
            ? '$missingDocs document${missingDocs == 1 ? '' : 's'} needed'
            : Formatters.currency(activeTotal.toStringAsFixed(2)));

    return IntrinsicHeight(
      child: Row(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Expanded(
          child: _StatChip(
            icon: Icons.verified_user_outlined,
            label: 'Credit profile',
            value: '${(data.profileStrength * 100).round()}%',
            caption: data.profileStrengthNudge,
            onTap: () => _showCreditTips(context),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _StatChip(
            icon: Icons.description_outlined,
            label: 'Active applications',
            value: active.isEmpty ? 'None yet' : '${active.length}',
            caption: activeCaption,
            onTap: () => active.isEmpty
                ? context.push('/loans/categories')
                : (missingDocs > 0 ? context.push('/documents') : context.go('/loans')),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _StatChip(
            icon: Icons.account_balance_wallet_outlined,
            label: 'Monthly EMI',
            value: data.totalMonthlyEmi > 0
                ? Formatters.currency(data.totalMonthlyEmi.toStringAsFixed(2))
                : '—',
            caption: nextMaturity != null ? 'Next: ${Formatters.date(nextMaturity)}' : null,
            onTap: () => context.go('/loans'),
          ),
        ),
      ],
      ),
    );
  }
}

class _StatChip extends StatelessWidget {
  const _StatChip({
    required this.icon,
    required this.label,
    required this.value,
    required this.onTap,
    this.caption,
  });

  final IconData icon;
  final String label;
  final String value;
  final String? caption;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final colorScheme = Theme.of(context).colorScheme;

    return AppCard(
      onTap: onTap,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: colorScheme.primary),
          const SizedBox(height: 8),
          Text(label, style: textTheme.labelSmall, maxLines: 1, overflow: TextOverflow.ellipsis),
          const SizedBox(height: 2),
          Text(value, style: textTheme.titleMedium, maxLines: 1, overflow: TextOverflow.ellipsis),
          if (caption != null) ...[
            const SizedBox(height: 2),
            Text(caption!,
                style: textTheme.bodySmall, maxLines: 1, overflow: TextOverflow.ellipsis),
          ],
        ],
      ),
    );
  }
}

/// Horizontal, color-coded category row — the fast path into the loan
/// journey, one tap from Home instead of a full 2-row grid.
class _QuickApplyRow extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SectionHeader(
          title: 'Quick apply',
          actionLabel: 'All loans',
          onAction: () => context.push('/loans/categories'),
        ),
        const SizedBox(height: 10),
        SizedBox(
          height: 90,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: kLoanCategories.length,
            separatorBuilder: (context, index) => const SizedBox(width: 12),
            itemBuilder: (context, index) {
              final category = kLoanCategories[index];
              final style = CategoryStyle.forId(category.id);
              return SizedBox(
                width: 76,
                child: InkWell(
                  borderRadius: BorderRadius.circular(16),
                  onTap: () => context.push('/loans/apply?categoryId=${category.id}'),
                  child: Column(
                    children: [
                      Container(
                        width: 52,
                        height: 52,
                        decoration: BoxDecoration(color: style.tint, shape: BoxShape.circle),
                        child: Icon(style.icon, color: style.color),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        category.title.replaceFirst(' Loan', ''),
                        textAlign: TextAlign.center,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: textTheme.labelSmall,
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _LoansForYouSection extends StatelessWidget {
  const _LoansForYouSection({required this.offers});

  final List<EligibilityOffer> offers;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SectionHeader(title: 'Loans for you'),
        const SizedBox(height: 8),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (var i = 0; i < offers.length; i++) ...[
                  if (i > 0) const SizedBox(width: 12),
                  Builder(builder: (context) {
                    final offer = offers[i];
                    final style = CategoryStyle.forId(offer.category.id);
                    return SizedBox(
                      width: 190,
                      child: AppCard(
                        onTap: () => context.push(
                          '/loans/apply?categoryId=${offer.category.id}',
                        ),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(6),
                                  decoration: BoxDecoration(
                                      color: style.tint, shape: BoxShape.circle),
                                  child: Icon(style.icon, size: 16, color: style.color),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    'Pre-approved',
                                    style:
                                        textTheme.labelSmall?.copyWith(color: style.color),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            Text(offer.category.title,
                                style: textTheme.titleSmall,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis),
                            const SizedBox(height: 4),
                            Text(
                              'Up to ${Formatters.currency(offer.eligibleAmount.toStringAsFixed(0))}',
                              style: textTheme.titleMedium,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            Text(
                              '${offer.category.indicativeRateMin}–${offer.category.indicativeRateMax}% p.a.',
                              style: textTheme.bodySmall,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                    );
                  }),
                ],
              ],
            ),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Indicative estimate — subject to verification. Not a guaranteed offer.',
          style: textTheme.bodySmall,
        ),
      ],
    );
  }
}

/// Lending partners — fully dynamic, backed by `lendingPartnersProvider`.
/// While no partner catalog exists yet (see `LendingPartnerRepository`),
/// this renders one premium "coming soon" card, never fake disabled
/// bank tiles; the day the backend adds real partners, this same
/// widget renders them as a horizontal list — no Flutter changes.
class _LendingPartnersSection extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final partnersAsync = ref.watch(lendingPartnersProvider);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SectionHeader(title: 'Lending partners'),
        const SizedBox(height: 8),
        partnersAsync.when(
          loading: () => const SkeletonCard(),
          error: (error, stackTrace) => const _LendingPartnersComingSoonCard(),
          data: (partners) => partners.isEmpty
              ? const _LendingPartnersComingSoonCard()
              : _LendingPartnersList(partners: partners),
        ),
      ],
    );
  }
}

class _LendingPartnersComingSoonCard extends StatelessWidget {
  const _LendingPartnersComingSoonCard();

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return AppCard(
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: const BoxDecoration(
              color: AppColors.accentGoldLight,
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.workspace_premium_outlined,
                color: AppColors.accentGold, size: 22),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('More lending partners coming soon',
                    style: textTheme.titleSmall),
                const SizedBox(height: 2),
                Text(
                  "We're onboarding more banks and NBFCs to bring you a wider choice of rates and offers.",
                  style: textTheme.bodySmall,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _LendingPartnersList extends StatelessWidget {
  const _LendingPartnersList({required this.partners});

  final List<LendingPartner> partners;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 132,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: partners.length,
        separatorBuilder: (context, index) => const SizedBox(width: 12),
        itemBuilder: (context, index) => _PartnerCard(partner: partners[index]),
      ),
    );
  }
}

class _PartnerCard extends StatelessWidget {
  const _PartnerCard({required this.partner});

  final LendingPartner partner;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final colorScheme = Theme.of(context).colorScheme;

    return SizedBox(
      width: 160,
      child: AppCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (partner.logoUrl != null)
              ClipRRect(
                borderRadius: BorderRadius.circular(6),
                child: Image.network(
                  partner.logoUrl!,
                  height: 28,
                  errorBuilder: (context, error, stackTrace) =>
                      Icon(Icons.account_balance_outlined, color: colorScheme.primary),
                ),
              )
            else
              Icon(Icons.account_balance_outlined, color: colorScheme.primary),
            const SizedBox(height: 8),
            Text(partner.name,
                style: textTheme.labelMedium, maxLines: 1, overflow: TextOverflow.ellipsis),
            if (partner.interestRateLabel != null) ...[
              const SizedBox(height: 2),
              Text(partner.interestRateLabel!,
                  style: textTheme.bodySmall?.copyWith(color: AppColors.success)),
            ],
            if (partner.offerLabel != null) ...[
              const SizedBox(height: 2),
              Text(partner.offerLabel!,
                  style: textTheme.bodySmall, maxLines: 2, overflow: TextOverflow.ellipsis),
            ],
          ],
        ),
      ),
    );
  }
}

class _RecentActivitySection extends StatelessWidget {
  const _RecentActivitySection({required this.data});

  final HomeDashboardData data;

  @override
  Widget build(BuildContext context) {
    final preview = data.recentActivity.take(2).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SectionHeader(title: 'Recent activity'),
        const SizedBox(height: 8),
        AppCard(
          child: Column(
            children: [
              for (var i = 0; i < preview.length; i++) ...[
                if (i > 0) const Divider(height: 20),
                _ActivityRow(item: preview[i]),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

class _ActivityRow extends StatelessWidget {
  const _ActivityRow({required this.item});

  final RecentActivityItem item;

  IconData get _icon => switch (item.kind) {
        ActivityKind.approved => Icons.check_circle_outline,
        ActivityKind.rejected => Icons.info_outline,
        ActivityKind.submitted => Icons.send_outlined,
        ActivityKind.disbursed => Icons.account_balance_outlined,
        ActivityKind.notification => Icons.notifications_outlined,
      };

  Color _color(BuildContext context) => switch (item.kind) {
        ActivityKind.approved => AppColors.success,
        ActivityKind.disbursed => AppColors.success,
        ActivityKind.rejected => Theme.of(context).colorScheme.error,
        _ => Theme.of(context).colorScheme.primary,
      };

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(_icon, size: 20, color: _color(context)),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(item.title, style: textTheme.bodyLarge),
              Text(item.subtitle,
                  style: textTheme.bodySmall,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis),
            ],
          ),
        ),
        Text(Formatters.relativeTime(item.timestamp), style: textTheme.labelSmall),
      ],
    );
  }
}

class _RecentDocumentsSection extends StatelessWidget {
  const _RecentDocumentsSection({required this.documents});

  final List<AppDocument> documents;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SectionHeader(
          title: 'Recent documents',
          actionLabel: 'View all',
          onAction: () => context.push('/documents'),
        ),
        const SizedBox(height: 8),
        AppCard(
          child: Column(
            children: [
              for (var i = 0; i < documents.length; i++) ...[
                if (i > 0) const Divider(height: 20),
                InkWell(
                  borderRadius: BorderRadius.circular(12),
                  onTap: () => context.push('/documents/${documents[i].id}', extra: documents[i]),
                  child: Row(
                    children: [
                      Icon(Icons.description_outlined,
                          size: 20, color: Theme.of(context).colorScheme.primary),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          documents[i].originalFileName,
                          style: textTheme.bodyMedium,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      Text(Formatters.relativeTime(documents[i].uploadedAt),
                          style: textTheme.labelSmall),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}
