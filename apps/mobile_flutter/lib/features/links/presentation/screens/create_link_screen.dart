import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';

import '../../../../core/config/app_config.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/validators.dart';
import '../../../../shared/widgets/app_widgets.dart';
import '../../data/links_repository.dart';
import '../providers/links_provider.dart';

class CreateLinkScreen extends ConsumerStatefulWidget {
  const CreateLinkScreen({super.key});

  @override
  ConsumerState<CreateLinkScreen> createState() => _CreateLinkScreenState();
}

class _CreateLinkScreenState extends ConsumerState<CreateLinkScreen> {
  final _urlController = TextEditingController();
  final _slugController = TextEditingController();
  final _titleController = TextEditingController();
  bool _showOptions = false;
  bool _enablePage = true;
  bool _loading = false;
  bool _copied = false;
  String? _error;

  @override
  void dispose() {
    _urlController.dispose();
    _slugController.dispose();
    _titleController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final validUrl = Validators.isValidUrl(_urlController.text);
    final slug = _slugController.text.isEmpty ? _suggestedSlug : _slugController.text;
    final shortLinkDisplay = AppConfig.shortLinkDisplay(slug);
    final shortLinkUrl = AppConfig.shortLinkUri(slug).toString();
    final recent = ref.watch(recentCreatedLinksProvider);
    return AppScaffold(
      title: 'Create Link',
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 112),
        children: <Widget>[
          AppCard(
            variant: AppCardVariant.glass,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                AppInput(
                  label: 'Destination URL',
                  hint: 'https://example.com/product',
                  prefixIcon: Icons.public,
                  controller: _urlController,
                  keyboardType: TextInputType.url,
                  suffix: HapticIconButton(icon: Icons.content_paste, label: 'Paste URL', onPressed: _paste),
                  onChanged: (_) => setState(() {}),
                ),
                const SizedBox(height: 12),
                Row(
                  children: <Widget>[
                    Icon(validUrl ? Icons.check_circle : Icons.info_outline, color: validUrl ? AppColors.success : AppColors.textTertiary, size: 18),
                    const SizedBox(width: 8),
                    Text(validUrl ? 'Valid URL' : 'Paste or type a destination URL', style: Theme.of(context).textTheme.bodyMedium),
                  ],
                ),
                const SizedBox(height: 18),
                AppCard(
                  variant: AppCardVariant.elevated,
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: <Widget>[
                      Expanded(
                        child: Text(shortLinkDisplay, style: Theme.of(context).textTheme.titleLarge, overflow: TextOverflow.ellipsis),
                      ),
                      HapticIconButton(
                        icon: _copied ? Icons.check_circle : Icons.copy,
                        label: 'Copy preview',
                        color: _copied ? AppColors.success : AppColors.accent,
                        onPressed: () async {
                          await Clipboard.setData(ClipboardData(text: shortLinkUrl));
                          setState(() => _copied = true);
                        },
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                AppCard(
                  variant: AppCardVariant.elevated,
                  padding: const EdgeInsets.all(16),
                  onTap: () => setState(() => _showOptions = !_showOptions),
                  child: Row(
                    children: <Widget>[
                      const Icon(Icons.tune, color: AppColors.accent),
                      const SizedBox(width: 12),
                      Expanded(child: Text('Optional fields', style: Theme.of(context).textTheme.labelLarge)),
                      Icon(_showOptions ? Icons.expand_less : Icons.expand_more),
                    ],
                  ),
                ),
                if (_showOptions) ...<Widget>[
                  const SizedBox(height: 16),
                  AppInput(label: 'Custom slug', hint: 'ramadhan-sale', prefixIcon: Icons.tag, controller: _slugController, onChanged: (_) => setState(() {})),
                  const SizedBox(height: 16),
                  AppInput(label: 'Title', hint: 'Campaign title', prefixIcon: Icons.title, controller: _titleController),
                  const SizedBox(height: 16),
                  PremiumSwitchTile(
                    title: 'Enable Link Page',
                    subtitle: 'Add a branded preview before redirect.',
                    value: _enablePage,
                    onChanged: (value) => setState(() => _enablePage = value),
                  ),
                ],
                if (_error != null) ...<Widget>[
                  const SizedBox(height: 16),
                  Text(_error!, style: const TextStyle(color: AppColors.error)),
                ],
                const SizedBox(height: 20),
                AppButton(label: 'Shorten & Share', loading: _loading, onPressed: validUrl ? _create : null),
              ],
            ),
          ).animate().fadeIn(duration: 300.ms).slideY(begin: 0.04),
          const SizedBox(height: 24),
          SectionHeader(title: 'Recent Created'),
          if (recent.isEmpty)
            const EmptyState(title: 'No recent links', description: 'Created links will appear here.')
          else
            ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: recent.length,
              itemBuilder: (context, index) {
                final link = recent[index];
                return Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: LinkTile(slug: link.slug, destination: link.destination, clicks: link.clicks)
                      .animate()
                      .fadeIn(duration: 300.ms, delay: (50 * index).ms)
                      .slideY(begin: 0.05),
                );
              },
            ),
        ],
      ),
    );
  }

  String get _suggestedSlug {
    final parsed = Uri.tryParse(_urlController.text.trim());
    final host = parsed?.host.isNotEmpty == true ? parsed!.host : 'new-link';
    return host.replaceAll(RegExp(r'[^a-zA-Z0-9]+'), '-').toLowerCase().replaceAll(RegExp(r'^-|-$'), '');
  }

  Future<void> _paste() async {
    final data = await Clipboard.getData(Clipboard.kTextPlain);
    if (data?.text != null) {
      _urlController.text = data!.text!;
      setState(() {});
    }
  }

  Future<void> _create() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final link = await ref.read(linksRepositoryProvider).createLink(
            destination: _urlController.text.trim(),
            slug: _slugController.text.trim().isEmpty ? null : _slugController.text.trim(),
            title: _titleController.text.trim(),
            linkPage: _enablePage,
          );
      ref.read(recentCreatedLinksProvider.notifier).state = [
        link,
        ...ref.read(recentCreatedLinksProvider),
      ];
      await Share.share(AppConfig.shortLinkUri(link.slug).toString());
    } catch (error) {
      setState(() => _error = 'Could not create link. Please try again.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }
}
