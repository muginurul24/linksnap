import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/config/app_config.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/network/api_endpoints.dart';
import '../../../../shared/models/app_models.dart';

final dashboardProvider = FutureProvider<DashboardData>((ref) async {
  final dio = ref.watch(dioProvider);
  try {
    final response = await dio.get<Map<String, dynamic>>(ApiEndpoints.dashboardOverview);
    final data = response.data?['data'];
    if (data is Map) {
      final typed = data.cast<String, dynamic>();
      final links = (typed['recentLinks'] as List? ?? <dynamic>[])
          .map((item) => LinkModel.fromJson((item as Map).cast<String, dynamic>()))
          .toList();
      return DashboardData(
        name: (typed['name'] ?? 'Rafi').toString(),
        linksCount: (typed['linksCount'] as num?)?.toInt() ?? (typed['totalLinks'] as num?)?.toInt() ?? links.length,
        clicksToday: (typed['clicksToday'] as num?)?.toInt() ?? 0,
        campaignsCount: (typed['campaignsCount'] as num?)?.toInt() ?? (typed['activeCampaigns'] as num?)?.toInt() ?? 0,
        plan: (typed['plan'] ?? 'FREE').toString(),
        recentLinks: links,
      );
    }
  } on DioException {
    if (!AppConfig.useSampleData) rethrow;
    await Future<void>.delayed(const Duration(milliseconds: 450));
  }
  if (!AppConfig.useSampleData) {
    throw StateError('Unexpected dashboard overview response.');
  }
  return DashboardData(
    name: 'Rafi',
    linksCount: 234,
    clicksToday: 8900,
    campaignsCount: 5,
    plan: 'FREE',
    recentLinks: sampleLinks.take(3).toList(),
  );
});
