import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/app_widgets.dart';
import '../../../auth/presentation/providers/auth_provider.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider);
    final user = auth.user;
    return AppScaffold(
      title: 'Settings',
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 112),
        children: <Widget>[
          if (auth.isLoading)
            const ShimmerLoader(variant: ShimmerVariant.card)
          else if (auth.error != null)
            ErrorStateWidget(message: auth.error!, onRetry: () => ref.read(authProvider.notifier).checkAuth())
          else if (user == null)
            EmptyState(title: 'No profile loaded', actionLabel: 'Sign in', onAction: () => context.go('/login'))
          else
            AppCard(
              variant: AppCardVariant.accent,
              onTap: () => context.push('/settings/profile'),
              child: Row(
                children: <Widget>[
                  Container(
                    width: 76,
                    height: 76,
                    padding: const EdgeInsets.all(2),
                    decoration: const BoxDecoration(shape: BoxShape.circle, gradient: accentGradient),
                    child: CircleAvatar(
                      backgroundColor: AppColors.surface100,
                      backgroundImage: user.avatarUrl == null ? null : CachedNetworkImageProvider(user.avatarUrl!),
                      child: user.avatarUrl == null ? Text((user.name.isEmpty ? 'L' : user.name[0]).toUpperCase(), style: const TextStyle(color: AppColors.accent, fontSize: 28, fontWeight: FontWeight.w800)) : null,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Text(user.name, style: Theme.of(context).textTheme.titleLarge, overflow: TextOverflow.ellipsis),
                        const SizedBox(height: 4),
                        Text(user.email, style: Theme.of(context).textTheme.bodyMedium, overflow: TextOverflow.ellipsis),
                        const SizedBox(height: 8),
                        StatusBadge(label: user.plan, tone: StatusBadgeTone.accent),
                      ],
                    ),
                  ),
                ],
              ),
            ).animate().fadeIn(duration: 300.ms),
          const SizedBox(height: 22),
          _SettingsSection(
            title: 'Account',
            items: <_SettingsItem>[
              _SettingsItem(Icons.person_outline, 'Profile', () => context.push('/settings/profile')),
              _SettingsItem(Icons.lock_outline, 'Password and 2FA', () => context.push('/settings/security')),
            ],
          ),
          _SettingsSection(
            title: 'Preferences',
            items: <_SettingsItem>[
              _SettingsItem(Icons.notifications_none, 'Notifications', () => HapticFeedback.lightImpact()),
              _SettingsItem(Icons.vibration, 'Haptics', () => HapticFeedback.lightImpact()),
            ],
          ),
          _SettingsSection(
            title: 'Developer',
            items: <_SettingsItem>[
              _SettingsItem(Icons.key, 'API Keys', () => context.push('/settings/api-keys')),
            ],
          ),
          _SettingsSection(
            title: 'Support',
            items: <_SettingsItem>[
              _SettingsItem(Icons.help_outline, 'Help', () => HapticFeedback.lightImpact()),
              _SettingsItem(Icons.privacy_tip_outlined, 'Privacy', () => HapticFeedback.lightImpact()),
              _SettingsItem(Icons.article_outlined, 'Terms', () => HapticFeedback.lightImpact()),
            ],
          ),
          const SizedBox(height: 18),
          AppCard(
            variant: AppCardVariant.error,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text('Danger Zone', style: Theme.of(context).textTheme.titleLarge?.copyWith(color: AppColors.error)),
                const SizedBox(height: 12),
                AppButton(label: 'Delete Account', variant: AppButtonVariant.danger, icon: Icons.delete_outline, onPressed: () => _confirmDelete(context)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _confirmDelete(BuildContext context) async {
    final controller = TextEditingController();
    await showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.surface100,
        title: const Text('Delete Account'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            const Text('Type DELETE to confirm.'),
            const SizedBox(height: 12),
            AppInput(controller: controller, hint: 'DELETE'),
          ],
        ),
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
    controller.dispose();
  }
}

class _SettingsSection extends StatelessWidget {
  const _SettingsSection({required this.title, required this.items});

  final String title;
  final List<_SettingsItem> items;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          SectionHeader(title: title),
          AppCard(
            variant: AppCardVariant.glass,
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: items.length,
              itemBuilder: (context, index) {
                final item = items[index];
                return ListTile(
                  minVerticalPadding: 12,
                  leading: Icon(item.icon, color: AppColors.accent),
                  title: Text(item.label, style: Theme.of(context).textTheme.labelLarge),
                  trailing: const Icon(Icons.chevron_right, color: AppColors.textTertiary),
                  onTap: () {
                    HapticFeedback.lightImpact();
                    item.onTap();
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _SettingsItem {
  const _SettingsItem(this.icon, this.label, this.onTap);
  final IconData icon;
  final String label;
  final VoidCallback onTap;
}
