import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/app_widgets.dart';
import '../providers/dashboard_provider.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashboardAsync = ref.watch(dashboardProvider);
    return AppScaffold(
      body: RefreshIndicator(
        color: AppColors.accent,
        backgroundColor: AppColors.surface100,
        onRefresh: () async => ref.refresh(dashboardProvider.future),
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 112),
          children: <Widget>[
            dashboardAsync.when(
              loading: () => const ShimmerLoader(variant: ShimmerVariant.dashboard),
              error: (error, _) => ErrorStateWidget(
                message: error.toString(),
                onRetry: () => ref.invalidate(dashboardProvider),
              ),
              data: (data) {
                if (data.recentLinks.isEmpty) {
                  return EmptyState(
                    title: 'No dashboard data yet',
                    description: 'Create a link to start collecting clicks.',
                    actionLabel: 'Create Link',
                    onAction: () => context.go('/create'),
                  );
                }
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Row(
                      children: <Widget>[
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: <Widget>[
                              Text('Good morning, ${data.name}', style: Theme.of(context).textTheme.headlineLarge),
                              const SizedBox(height: 4),
                              Text(DateFormat('EEEE, MMMM d, y').format(DateTime.now()), style: Theme.of(context).textTheme.bodyMedium),
                            ],
                          ),
                        ),
                        AppCard(
                          variant: AppCardVariant.accent,
                          padding: const EdgeInsets.all(2),
                          onTap: () => context.go('/settings/profile'),
                          child: const CircleAvatar(
                            radius: 26,
                            backgroundColor: AppColors.accent,
                            child: Text('R', style: TextStyle(color: AppColors.textInverse, fontWeight: FontWeight.w700, fontSize: 20)),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),
                    SizedBox(
                      height: 128,
                      child: ListView(
                        scrollDirection: Axis.horizontal,
                        children: <Widget>[
                          SizedBox(width: 146, child: StatsCard(value: '${data.linksCount}', label: 'Links', icon: Icons.link, accentColor: AppColors.accent)),
                          const SizedBox(width: 12),
                          SizedBox(width: 156, child: StatsCard(value: NumberFormat.compact().format(data.clicksToday), label: 'Clicks Today', icon: Icons.touch_app, accentColor: AppColors.success)),
                          const SizedBox(width: 12),
                          SizedBox(width: 146, child: StatsCard(value: '${data.campaignsCount}', label: 'Campaigns', icon: Icons.flag, accentColor: AppColors.info)),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),
                    GridView.count(
                      crossAxisCount: 2,
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      mainAxisSpacing: 12,
                      crossAxisSpacing: 12,
                      childAspectRatio: 1.65,
                      children: <Widget>[
                        QuickActionCard(icon: Icons.add_circle_outline, label: 'Create Link', onTap: () => context.go('/create')),
                        QuickActionCard(icon: Icons.qr_code_scanner, label: 'Scan QR', onTap: () => context.go('/scan')),
                        QuickActionCard(icon: Icons.link, label: 'My Links', onTap: () => context.go('/links')),
                        QuickActionCard(icon: Icons.flag, label: 'Campaigns', onTap: () => context.go('/campaigns')),
                      ],
                    ),
                    if (data.plan.toUpperCase() == 'FREE') ...<Widget>[
                      const SizedBox(height: 24),
                      AppCard(
                        variant: AppCardVariant.accent,
                        onTap: () => context.go('/billing'),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: <Widget>[
                            Text('Upgrade to Pro', style: Theme.of(context).textTheme.headlineMedium?.copyWith(color: AppColors.accent)),
                            const SizedBox(height: 8),
                            Text('Unlock higher limits, advanced analytics, API access, and premium Link Pages.', style: Theme.of(context).textTheme.bodyMedium),
                            const SizedBox(height: 16),
                            AppButton(label: 'View Plans', onPressed: () => context.go('/billing'), fullWidth: false),
                          ],
                        ),
                      ),
                    ],
                    const SizedBox(height: 24),
                    SectionHeader(title: 'Recent Links', actionLabel: 'View All', onAction: () => context.go('/links')),
                    ListView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: data.recentLinks.length,
                      itemBuilder: (context, index) {
                        final link = data.recentLinks[index];
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: LinkTile(
                            slug: link.slug,
                            destination: link.destination,
                            clicks: link.clicks,
                            onTap: () => context.push('/links/${link.id}'),
                          ).animate().fadeIn(duration: 300.ms, delay: (50 * index).ms).slideY(begin: 0.05),
                        );
                      },
                    ),
                  ],
                ).animate().fadeIn(duration: 300.ms);
              },
            ),
          ],
        ),
      ),
    );
  }
}
