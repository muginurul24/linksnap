import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/app_widgets.dart';
import '../providers/links_provider.dart';

class LinkDetailScreen extends ConsumerWidget {
  const LinkDetailScreen({super.key, required this.id});

  final String id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final linkAsync = ref.watch(linkDetailProvider(id));
    return AppScaffold(
      title: 'Link Details',
      actions: <Widget>[
        HapticIconButton(icon: Icons.edit_outlined, label: 'Edit link', onPressed: () => context.push('/links/$id/edit')),
      ],
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
        children: <Widget>[
          linkAsync.when(
            loading: () => const ShimmerLoader(variant: ShimmerVariant.detail),
            error: (error, _) => ErrorStateWidget(message: error.toString(), onRetry: () => ref.invalidate(linkDetailProvider(id))),
            data: (link) {
              final shortUrl = 'https://linksnap.id/${link.slug}';
              return Column(
                children: <Widget>[
                  AppCard(
                    variant: AppCardVariant.glass,
                    padding: const EdgeInsets.symmetric(vertical: 32, horizontal: 20),
                    child: Column(
                      children: <Widget>[
                        Text('linksnap.id/${link.slug}', style: Theme.of(context).textTheme.headlineLarge, textAlign: TextAlign.center),
                        const SizedBox(height: 20),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: <Widget>[
                            AppButton(label: 'Copy', icon: Icons.copy, variant: AppButtonVariant.secondary, fullWidth: false, onPressed: () => Clipboard.setData(ClipboardData(text: shortUrl))),
                            const SizedBox(width: 12),
                            AppButton(label: 'Share', icon: Icons.share, fullWidth: false, onPressed: () => Share.share(shortUrl)),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: <Widget>[
                      Expanded(child: StatsCard(value: '${link.clicks}', label: 'Total Clicks', icon: Icons.touch_app)),
                      const SizedBox(width: 12),
                      Expanded(child: StatsCard(value: '${link.todayClicks}', label: 'Today', icon: Icons.trending_up, accentColor: AppColors.success)),
                      const SizedBox(width: 12),
                      Expanded(child: StatsCard(value: '${link.uniqueVisitors}', label: 'Unique', icon: Icons.people, accentColor: AppColors.info)),
                    ],
                  ),
                  const SizedBox(height: 16),
                  AppCard(
                    variant: AppCardVariant.glass,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Text('Destination', style: Theme.of(context).textTheme.labelSmall),
                        const SizedBox(height: 8),
                        Text(link.destination, style: Theme.of(context).textTheme.bodyLarge, maxLines: 2, overflow: TextOverflow.ellipsis),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  GridView.count(
                    crossAxisCount: 2,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                    childAspectRatio: 2.4,
                    children: <Widget>[
                      AppButton(label: 'QR', icon: Icons.qr_code, variant: AppButtonVariant.secondary, onPressed: () => _showQr(context, shortUrl)),
                      AppButton(label: 'Analytics', icon: Icons.analytics, variant: AppButtonVariant.secondary, onPressed: () => context.push('/links/$id/analytics')),
                      AppButton(label: 'Edit', icon: Icons.edit, variant: AppButtonVariant.secondary, onPressed: () => context.push('/links/$id/edit')),
                      AppButton(label: 'Share', icon: Icons.share, variant: AppButtonVariant.secondary, onPressed: () => Share.share(shortUrl)),
                      AppButton(label: 'Open', icon: Icons.open_in_new, variant: AppButtonVariant.secondary, onPressed: () => launchUrl(Uri.parse(link.destination))),
                      AppButton(label: 'Delete', icon: Icons.delete_outline, variant: AppButtonVariant.danger, onPressed: () => _confirmDelete(context)),
                    ],
                  ),
                  const SizedBox(height: 16),
                  if (link.hasLinkPage)
                    AppCard(
                      variant: AppCardVariant.accent,
                      child: Row(
                        children: <Widget>[
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: <Widget>[
                                Text('Link Page Enabled', style: Theme.of(context).textTheme.headlineMedium?.copyWith(color: AppColors.accent)),
                                const SizedBox(height: 4),
                                Text('Preview, CTA, QR, and countdown are active.', style: Theme.of(context).textTheme.bodyMedium),
                              ],
                            ),
                          ),
                          const StatusBadge(label: 'Live', tone: StatusBadgeTone.active),
                        ],
                      ),
                    ),
                  const SizedBox(height: 16),
                  AppCard(
                    variant: AppCardVariant.glass,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Text('Smart Rules', style: Theme.of(context).textTheme.titleLarge),
                        const SizedBox(height: 12),
                        const EmptyState(title: 'No smart rules', description: 'Add rules from the edit screen.', icon: Icons.route),
                      ],
                    ),
                  ),
                ],
              ).animate().fadeIn(duration: 300.ms);
            },
          ),
        ],
      ),
    );
  }

  Future<void> _showQr(BuildContext context, String url) async {
    await showDialog<void>(
      context: context,
      builder: (context) => Dialog(
        backgroundColor: AppColors.surface100,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              QrDisplay(data: url),
              const SizedBox(height: 20),
              AppButton(label: 'Share QR Link', icon: Icons.share, onPressed: () => Share.share(url)),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _confirmDelete(BuildContext context) async {
    await showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.surface100,
        title: const Text('Delete Link'),
        content: const Text('This cannot be undone.'),
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
            child: const Text('Delete Link', style: TextStyle(color: AppColors.error)),
          ),
        ],
      ),
    );
  }
}
