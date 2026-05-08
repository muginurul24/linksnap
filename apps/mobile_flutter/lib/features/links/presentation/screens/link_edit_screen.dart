import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/app_widgets.dart';
import '../../data/links_repository.dart';
import '../providers/links_provider.dart';

class LinkEditScreen extends ConsumerStatefulWidget {
  const LinkEditScreen({super.key, required this.id});

  final String id;

  @override
  ConsumerState<LinkEditScreen> createState() => _LinkEditScreenState();
}

class _LinkEditScreenState extends ConsumerState<LinkEditScreen> {
  final _slugController = TextEditingController();
  final _destinationController = TextEditingController();
  final _titleController = TextEditingController();
  final _brandController = TextEditingController(text: 'LinkSnap Merch');
  final _descriptionController = TextEditingController(text: 'Premium offer for verified customers.');
  final _ctaController = TextEditingController(text: 'Continue');
  bool _linkPage = true;
  bool _countdown = false;
  bool _smartRules = false;
  int _themeIndex = 0;
  int _accentIndex = 0;
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _slugController.dispose();
    _destinationController.dispose();
    _titleController.dispose();
    _brandController.dispose();
    _descriptionController.dispose();
    _ctaController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final linkAsync = ref.watch(linkDetailProvider(widget.id));
    return AppScaffold(
      title: 'Edit Link',
      body: linkAsync.when(
        loading: () => const Padding(padding: EdgeInsets.all(20), child: ShimmerLoader(variant: ShimmerVariant.detail)),
        error: (error, _) => ErrorStateWidget(message: error.toString(), onRetry: () => ref.invalidate(linkDetailProvider(widget.id))),
        data: (link) {
          if (_slugController.text.isEmpty) {
            _slugController.text = link.slug;
            _destinationController.text = link.destination;
            _titleController.text = link.title;
            _linkPage = link.hasLinkPage;
          }
          return Stack(
            children: <Widget>[
              ListView(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 104),
                children: <Widget>[
                  SectionHeader(title: 'Basic Info'),
                  AppCard(
                    variant: AppCardVariant.glass,
                    child: Column(
                      children: <Widget>[
                        AppInput(label: 'Slug', prefixIcon: Icons.tag, controller: _slugController),
                        const SizedBox(height: 16),
                        AppInput(label: 'Destination URL', prefixIcon: Icons.public, controller: _destinationController, keyboardType: TextInputType.url),
                        const SizedBox(height: 16),
                        AppInput(label: 'Title', prefixIcon: Icons.title, controller: _titleController),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                  PremiumSwitchTile(title: 'Link Page', subtitle: 'Show a branded preview before redirect.', value: _linkPage, onChanged: (value) => setState(() => _linkPage = value)),
                  if (_linkPage) ...<Widget>[
                    const SizedBox(height: 14),
                    AppCard(
                      variant: AppCardVariant.glass,
                      child: Column(
                        children: <Widget>[
                          AppInput(label: 'Brand name', controller: _brandController, prefixIcon: Icons.storefront),
                          const SizedBox(height: 16),
                          AppInput(label: 'Description', controller: _descriptionController, prefixIcon: Icons.notes, maxLines: 3),
                          const SizedBox(height: 16),
                          AppInput(label: 'CTA text', controller: _ctaController, prefixIcon: Icons.ads_click),
                          const SizedBox(height: 16),
                          _ColorPicker(selected: _accentIndex, onSelected: (index) => setState(() => _accentIndex = index)),
                          const SizedBox(height: 16),
                          PremiumSwitchTile(title: 'Countdown', subtitle: 'Add urgency for limited offers.', value: _countdown, onChanged: (value) => setState(() => _countdown = value)),
                          const SizedBox(height: 16),
                          SegmentedControl(values: const <String>['Auto', 'Dark', 'Light'], selectedIndex: _themeIndex, onSelected: (index) => setState(() => _themeIndex = index)),
                          const SizedBox(height: 16),
                          AppCard(
                            variant: AppCardVariant.accent,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: <Widget>[
                                Text(_brandController.text, style: Theme.of(context).textTheme.titleLarge?.copyWith(color: AppColors.accent)),
                                const SizedBox(height: 6),
                                Text(_descriptionController.text, style: Theme.of(context).textTheme.bodyMedium),
                                const SizedBox(height: 12),
                                StatusBadge(label: _ctaController.text, tone: StatusBadgeTone.accent),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                  const SizedBox(height: 20),
                  PremiumSwitchTile(title: 'Smart Rules', subtitle: 'Redirect by device, location, or campaign.', value: _smartRules, onChanged: (value) => setState(() => _smartRules = value)),
                  if (_smartRules) ...<Widget>[
                    const SizedBox(height: 14),
                    AppCard(
                      variant: AppCardVariant.glass,
                      child: Column(
                        children: <Widget>[
                          AppInput(label: 'Condition', hint: 'Device is mobile', prefixIcon: Icons.rule),
                          const SizedBox(height: 12),
                          AppInput(label: 'Redirect URL', hint: 'https://m.example.com', prefixIcon: Icons.alt_route),
                          const SizedBox(height: 12),
                          AppButton(label: 'Add Rule', icon: Icons.add, variant: AppButtonVariant.secondary, onPressed: () {}),
                        ],
                      ),
                    ),
                  ],
                  if (_error != null) ...<Widget>[
                    const SizedBox(height: 16),
                    Text(_error!, style: const TextStyle(color: AppColors.error)),
                  ],
                ],
              ).animate().fadeIn(duration: 300.ms),
              Align(
                alignment: Alignment.bottomCenter,
                child: Container(
                  padding: const EdgeInsets.fromLTRB(20, 14, 20, 20),
                  decoration: BoxDecoration(
                    color: AppColors.surface.withOpacity(0.92),
                    border: const Border(top: BorderSide(color: AppColors.surfaceBorder)),
                  ),
                  child: AppButton(label: 'Save Changes', loading: _saving, onPressed: _save),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Future<void> _save() async {
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await ref.read(linksRepositoryProvider).updateLink(widget.id, <String, dynamic>{
        'slug': _slugController.text.trim(),
        'destinationUrl': _destinationController.text.trim(),
        'title': _titleController.text.trim(),
      });
      if (mounted) {
        setState(() => _saving = false);
        context.pop();
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _saving = false;
          _error = 'Could not save changes. Please try again.';
        });
      }
    }
  }
}

class _ColorPicker extends StatelessWidget {
  const _ColorPicker({required this.selected, required this.onSelected});

  final int selected;
  final ValueChanged<int> onSelected;

  @override
  Widget build(BuildContext context) {
    const colors = <Color>[AppColors.accent, AppColors.secondary, AppColors.info, AppColors.error];
    return Row(
      children: colors.asMap().entries.map((entry) {
        return GestureDetector(
          onTap: () {
            HapticFeedback.lightImpact();
            onSelected(entry.key);
          },
          child: Container(
            width: 48,
            height: 48,
            margin: const EdgeInsets.only(right: 10),
            decoration: BoxDecoration(
              color: entry.value,
              shape: BoxShape.circle,
              border: Border.all(color: selected == entry.key ? AppColors.textPrimary : Colors.transparent, width: 2),
            ),
          ),
        );
      }).toList(),
    );
  }
}
