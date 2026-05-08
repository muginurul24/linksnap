import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/config/app_config.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../../shared/models/app_models.dart';

final linksRepositoryProvider = Provider<LinksRepository>((ref) {
  return LinksRepository(ref.watch(dioProvider));
});

class LinksRepository {
  const LinksRepository(this._dio);

  final Dio _dio;

  Future<List<LinkModel>> listLinks({String query = '', String filter = 'All', int page = 1}) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        ApiEndpoints.links,
        queryParameters: <String, dynamic>{'search': query, 'page': page},
      );
      final data = response.data?['data'];
      final items = data is List ? data : (data as Map?)?['items'];
      if (items is List) {
        final links = items.map((item) => LinkModel.fromJson((item as Map).cast<String, dynamic>())).toList();
        return _filterLinks(links: links, query: query, filter: filter);
      }
    } catch (_) {
      if (!AppConfig.useSampleData) rethrow;
      await Future<void>.delayed(const Duration(milliseconds: 350));
    }
    if (!AppConfig.useSampleData) {
      throw StateError('Unexpected links response.');
    }
    return _filterLinks(links: sampleLinks, query: query, filter: filter);
  }

  Future<LinkModel> getLink(String id) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(ApiEndpoints.link(id));
      final data = response.data?['data'];
      if (data is Map) return LinkModel.fromJson(data.cast<String, dynamic>());
    } catch (_) {
      if (!AppConfig.useSampleData) rethrow;
      await Future<void>.delayed(const Duration(milliseconds: 250));
    }
    if (!AppConfig.useSampleData) {
      throw StateError('Unexpected link response.');
    }
    return sampleLinks.firstWhere((link) => link.id == id, orElse: () => sampleLinks.first);
  }

  Future<LinkModel> createLink({required String destination, String? slug, String? title, bool linkPage = false}) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        ApiEndpoints.linkCreate,
        data: <String, dynamic>{
          'destinationUrl': destination,
          'slug': slug,
          'title': title,
        },
      );
      final data = response.data?['data'];
      if (data is Map) return LinkModel.fromJson(data.cast<String, dynamic>());
    } catch (_) {
      if (!AppConfig.useSampleData) rethrow;
      await Future<void>.delayed(const Duration(milliseconds: 450));
    }
    if (!AppConfig.useSampleData) {
      throw StateError('Unexpected create link response.');
    }
    final generatedSlug = slug?.isNotEmpty == true ? slug! : Uri.parse(destination).host.replaceAll('.', '-');
    return LinkModel(
      id: 'lnk_new',
      slug: generatedSlug,
      destination: destination,
      title: title?.isNotEmpty == true ? title! : 'New short link',
      clicks: 0,
      todayClicks: 0,
      uniqueVisitors: 0,
      active: true,
      hasLinkPage: linkPage,
    );
  }

  Future<void> updateLink(String id, Map<String, dynamic> payload) async {
    try {
      await _dio.patch<Map<String, dynamic>>(ApiEndpoints.linkEdit(id), data: payload);
    } catch (_) {
      if (!AppConfig.useSampleData) rethrow;
      await Future<void>.delayed(const Duration(milliseconds: 350));
    }
  }

  Future<void> deleteLink(String id) async {
    try {
      await _dio.delete<Map<String, dynamic>>(ApiEndpoints.linkDelete(id));
    } catch (_) {
      if (!AppConfig.useSampleData) rethrow;
      await Future<void>.delayed(const Duration(milliseconds: 250));
    }
  }

  List<LinkModel> _filterLinks({required List<LinkModel> links, required String query, required String filter}) {
    final needle = query.trim().toLowerCase();
    return links.where((link) {
      final matchesSearch = needle.isEmpty ||
          link.slug.toLowerCase().contains(needle) ||
          link.destination.toLowerCase().contains(needle) ||
          link.title.toLowerCase().contains(needle);
      final matchesFilter = switch (filter) {
        'Active' => link.active,
        'With Pages' => link.hasLinkPage,
        'By Campaign' => link.campaignId != null,
        _ => true,
      };
      return matchesSearch && matchesFilter;
    }).toList();
  }
}
