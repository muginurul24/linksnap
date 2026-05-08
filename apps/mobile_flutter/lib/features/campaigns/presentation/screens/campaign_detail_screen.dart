import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../shared/models/app_models.dart';
import '../../../../shared/widgets/app_widgets.dart';
import '../../../links/presentation/providers/links_provider.dart';
import '../providers/campaigns_provider.dart';

class CampaignDetailScreen extends ConsumerWidget {
  const CampaignDetailScreen({super.key, required this.id});

  final String id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final campaignsAsync = ref.watch(campaignsProvider);
    final linksAsync = ref.watch(linksListProvider);
    return AppScaffold(
      title: 'Campaign Detail',
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
        children: <Widget>[
          campaignsAsync.when(
            loading: () => const ShimmerLoader(variant: ShimmerVariant.detail),
            error: (error, _) => ErrorStateWidget(message: error.toString(), onRetry: () => ref.invalidate(campaignsProvider)),
            data: (campaigns) {
              final campaign = campaigns.firstWhere((item) => item.id == id, orElse: () => sampleCampaigns.first);
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  AppCard(
                    variant: AppCardVariant.accent,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Text(campaign.name, style: Theme.of(context).textTheme.headlineMedium?.copyWith(color: AppColors.accent)),
                        const SizedBox(height: 8),
                        Row(
                          children: <Widget>[
                            Expanded(child: StatsCard(value: '${campaign.linkCount}', label: 'Links', icon: Icons.link)),
                            const SizedBox(width: 12),
                            Expanded(child: StatsCard(value: '${campaign.totalClicks}', label: 'Clicks', icon: Icons.touch_app, accentColor: AppColors.success)),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 18),
                  SectionHeader(title: 'Campaign Links', actionLabel: 'Add', onAction: () => HapticFeedback.lightImpact()),
                  linksAsync.when(
                    loading: () => const ShimmerLoader(variant: ShimmerVariant.list),
                    error: (error, _) => ErrorStateWidget(message: error.toString(), onRetry: () => ref.invalidate(linksListProvider)),
                    data: (links) {
                      final campaignLinks = links.where((link) => link.campaignId == campaign.id).toList();
                      if (campaignLinks.isEmpty) {
                        return const EmptyState(title: 'No links in campaign', description: 'Add links to track campaign performance.', icon: Icons.link_off);
                      }
                      return ListView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: campaignLinks.length,
                        itemBuilder: (context, index) {
                          final link = campaignLinks[index];
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 10),
                            child: Dismissible(
                              key: ValueKey<String>('campaign-${link.id}'),
                              confirmDismiss: (_) async {
                                HapticFeedback.lightImpact();
                                return false;
                              },
                              background: Container(
                                alignment: Alignment.centerRight,
                                padding: const EdgeInsets.only(right: 20),
                                decoration: BoxDecoration(color: AppColors.error.withOpacity(0.16), borderRadius: BorderRadius.circular(20)),
                                child: const Icon(Icons.remove_circle_outline, color: AppColors.error),
                              ),
                              child: LinkTile(slug: link.slug, destination: link.destination, clicks: link.clicks),
                            ).animate().fadeIn(duration: 300.ms, delay: (50 * index).ms).slideY(begin: 0.05),
                          );
                        },
                      );
                    },
                  ),
                  const SizedBox(height: 18),
                  AppCard(
                    variant: AppCardVariant.glass,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Text('UTM Template', style: Theme.of(context).textTheme.titleLarge),
                        const SizedBox(height: 14),
                        AppInput(label: 'Source', hint: campaign.source, prefixIcon: Icons.source),
                        const SizedBox(height: 12),
                        AppInput(label: 'Medium', hint: campaign.medium, prefixIcon: Icons.campaign),
                        const SizedBox(height: 12),
                        AppButton(label: 'Save Template', variant: AppButtonVariant.secondary, onPressed: () {}),
                      ],
                    ),
                  ),
                  const SizedBox(height: 18),
                  AppButton(label: 'Delete Campaign', variant: AppButtonVariant.danger, icon: Icons.delete_outline, onPressed: () => _confirmDelete(context)),
                ],
              ).animate().fadeIn(duration: 300.ms);
            },
          ),
        ],
      ),
    );
  }

  Future<void> _confirmDelete(BuildContext context) async {
    await showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.surface100,
        title: const Text('Delete Campaign'),
        content: const Text('Links will remain active, but campaign grouping will be removed.'),
        actions: <Widget>[
          TextButton(
            onPressed: () {
              HapticFeedback.lightImpact();
              Navigator.pop(context);
            },
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              HapticFeedback.lightImpact();
              Navigator.pop(context);
            },
            child: const Text('Delete', style: TextStyle(color: AppColors.error)),
          ),
        ],
      ),
    );
  }
}
