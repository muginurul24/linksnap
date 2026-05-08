import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/config/app_config.dart';
import '../../../../shared/models/app_models.dart';
import '../../data/links_repository.dart';

final linksSearchProvider = StateProvider<String>((ref) => '');
final linksFilterProvider = StateProvider<String>((ref) => 'All');
final linksPageProvider = StateProvider<int>((ref) => 1);

final linksListProvider = FutureProvider<List<LinkModel>>((ref) async {
  final repository = ref.watch(linksRepositoryProvider);
  final query = ref.watch(linksSearchProvider);
  final filter = ref.watch(linksFilterProvider);
  final page = ref.watch(linksPageProvider);
  return repository.listLinks(query: query, filter: filter, page: page);
});

final linkDetailProvider = FutureProvider.family<LinkModel, String>((ref, id) async {
  return ref.watch(linksRepositoryProvider).getLink(id);
});

final recentCreatedLinksProvider = StateProvider<List<LinkModel>>((ref) {
  return AppConfig.useSampleData ? sampleLinks.take(3).toList() : <LinkModel>[];
});
