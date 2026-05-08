import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/app_widgets.dart';
import '../providers/campaigns_provider.dart';

class CampaignsScreen extends ConsumerWidget {
  const CampaignsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final campaignsAsync = ref.watch(campaignsProvider);
    return AppScaffold(
      title: 'Campaigns',
      actions: <Widget>[
        HapticIconButton(icon: Icons.add, label: 'Create campaign', onPressed: () => _showCreateSheet(context)),
      ],
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 112),
        children: <Widget>[
          campaignsAsync.when(
            loading: () => const ShimmerLoader(variant: ShimmerVariant.list),
            error: (error, _) => ErrorStateWidget(message: error.toString(), onRetry: () => ref.invalidate(campaignsProvider)),
            data: (campaigns) {
              if (campaigns.isEmpty) {
                return EmptyState(title: 'No campaigns yet', description: 'Group links and track UTM performance.', actionLabel: 'Create Campaign', onAction: () => _showCreateSheet(context));
              }
              return ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: campaigns.length,
                itemBuilder: (context, index) {
                  final campaign = campaigns[index];
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: AppCard(
                      variant: AppCardVariant.glass,
                      onTap: () => context.push('/campaigns/${campaign.id}'),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: <Widget>[
                          Row(
                            children: <Widget>[
                              Expanded(child: Text(campaign.name, style: Theme.of(context).textTheme.titleLarge, overflow: TextOverflow.ellipsis)),
                              StatusBadge(label: '${campaign.linkCount} links', tone: StatusBadgeTone.accent),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Text('${NumberFormat.compact().format(campaign.totalClicks)} total clicks', style: Theme.of(context).textTheme.bodyMedium),
                          const SizedBox(height: 14),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: <Widget>[
                              StatusBadge(label: campaign.source, tone: StatusBadgeTone.info),
                              StatusBadge(label: campaign.medium, tone: StatusBadgeTone.active),
                              StatusBadge(label: campaign.campaign, tone: StatusBadgeTone.accent),
                            ],
                          ),
                        ],
                      ),
                    ).animate().fadeIn(duration: 300.ms, delay: (50 * index).ms).slideY(begin: 0.05),
                  );
                },
              );
            },
          ),
        ],
      ),
    );
  }

  void _showCreateSheet(BuildContext context) {
    final nameController = TextEditingController();
    final sourceController = TextEditingController(text: 'instagram');
    final mediumController = TextEditingController(text: 'social');
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface100,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) => Padding(
        padding: EdgeInsets.fromLTRB(20, 20, 20, MediaQuery.of(context).viewInsets.bottom + 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            AppInput(label: 'Campaign name', controller: nameController, prefixIcon: Icons.flag_outlined),
            const SizedBox(height: 14),
            AppInput(label: 'UTM source', controller: sourceController, prefixIcon: Icons.source),
            const SizedBox(height: 14),
            AppInput(label: 'UTM medium', controller: mediumController, prefixIcon: Icons.campaign),
            const SizedBox(height: 18),
            AppButton(
              label: 'Create Campaign',
              onPressed: () {
                HapticFeedback.lightImpact();
                Navigator.pop(context);
              },
            ),
          ],
        ),
      ),
    );
  }
}
