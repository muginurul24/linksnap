import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/config/app_config.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/app_widgets.dart';
import '../../data/links_repository.dart';
import '../providers/links_provider.dart';

class LinksListScreen extends ConsumerStatefulWidget {
  const LinksListScreen({super.key});

  @override
  ConsumerState<LinksListScreen> createState() => _LinksListScreenState();
}

class _LinksListScreenState extends ConsumerState<LinksListScreen> {
  final _searchController = TextEditingController();
  final _scrollController = ScrollController();
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _searchController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final linksAsync = ref.watch(linksListProvider);
    final filter = ref.watch(linksFilterProvider);
    return AppScaffold(
      title: 'My Links',
      actions: <Widget>[
        HapticIconButton(icon: Icons.sort, label: 'Sort links', onPressed: _showSortSheet),
      ],
      body: RefreshIndicator(
        color: AppColors.accent,
        onRefresh: () async => ref.refresh(linksListProvider.future),
        child: ListView(
          controller: _scrollController,
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 112),
          children: <Widget>[
            AppInput(
              hint: 'Search links',
              prefixIcon: Icons.search,
              controller: _searchController,
              onChanged: _onSearch,
            ),
            const SizedBox(height: 14),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: <Widget>[
                  for (final chip in <String>['All', 'Active', 'With Pages', 'By Campaign'])
                    FilterChipButton(
                      label: chip,
                      selected: filter == chip,
                      onSelected: () => ref.read(linksFilterProvider.notifier).state = chip,
                    ),
                ],
              ),
            ),
            const SizedBox(height: 18),
            linksAsync.when(
              loading: () => const ShimmerLoader(variant: ShimmerVariant.list),
              error: (error, _) => ErrorStateWidget(
                message: error.toString(),
                onRetry: () => ref.invalidate(linksListProvider),
              ),
              data: (links) {
                if (links.isEmpty) {
                  return EmptyState(
                    title: 'Create your first link',
                    description: 'Shorten a destination and share it with your audience.',
                    actionLabel: 'Create Link',
                    onAction: () => context.go('/create'),
                  );
                }
                return ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: links.length,
                  itemBuilder: (context, index) {
                    final link = links[index];
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: Dismissible(
                        key: ValueKey<String>(link.id),
                        confirmDismiss: (direction) async {
                          HapticFeedback.lightImpact();
                          if (direction == DismissDirection.endToStart) {
                            await Clipboard.setData(ClipboardData(text: AppConfig.shortLinkUri(link.slug).toString()));
                            return false;
                          }
                          final confirmed = await _confirmDelete(link.slug);
                          if (!confirmed) return false;
                          try {
                            await ref.read(linksRepositoryProvider).deleteLink(link.id);
                            ref.invalidate(linksListProvider);
                            return true;
                          } catch (_) {
                            if (mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Could not delete link. Please try again.')),
                              );
                            }
                            return false;
                          }
                        },
                        background: _dismissBg(AppColors.error, Icons.delete_outline, Alignment.centerLeft),
                        secondaryBackground: _dismissBg(AppColors.accent, Icons.copy, Alignment.centerRight),
                        child: LinkTile(
                          slug: link.slug,
                          destination: link.destination,
                          clicks: link.clicks,
                          status: link.active ? 'Active' : 'Paused',
                          onTap: () => context.push('/links/${link.id}'),
                        ).animate().fadeIn(duration: 300.ms, delay: (50 * index).ms).slideY(begin: 0.05),
                      ),
                    );
                  },
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _dismissBg(Color color, IconData icon, Alignment alignment) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      alignment: alignment,
      padding: const EdgeInsets.symmetric(horizontal: 22),
      decoration: BoxDecoration(color: color.withOpacity(0.18), borderRadius: BorderRadius.circular(20)),
      child: Icon(icon, color: color),
    );
  }

  void _onSearch(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 300), () {
      ref.read(linksSearchProvider.notifier).state = value;
    });
  }

  void _onScroll() {
    if (!_scrollController.hasClients) return;
    final nearEnd = _scrollController.position.pixels > _scrollController.position.maxScrollExtent - 160;
    if (nearEnd) {
      ref.read(linksPageProvider.notifier).state = ref.read(linksPageProvider) + 1;
    }
  }

  Future<bool> _confirmDelete(String slug) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.surface100,
        title: const Text('Delete Link'),
        content: Text('Delete ${AppConfig.shortLinkDisplay(slug)}?'),
        actions: <Widget>[
          TextButton(
            onPressed: () {
              HapticFeedback.lightImpact();
              Navigator.pop(context, false);
            },
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              HapticFeedback.lightImpact();
              Navigator.pop(context, true);
            },
            child: const Text('Delete', style: TextStyle(color: AppColors.error)),
          ),
        ],
      ),
    );
    return confirmed ?? false;
  }

  void _showSortSheet() {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: AppColors.surface100,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              for (final option in <String>['Newest', 'Most Clicked', 'Alphabetical'])
                AppCard(
                  variant: AppCardVariant.elevated,
                  padding: const EdgeInsets.all(16),
                  onTap: () => Navigator.pop(context),
                  child: Row(
                    children: <Widget>[
                      const Icon(Icons.sort, color: AppColors.accent),
                      const SizedBox(width: 12),
                      Text(option, style: Theme.of(context).textTheme.labelLarge),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
