import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/config/app_config.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/network/api_endpoints.dart';
import '../../../../shared/models/app_models.dart';

final analyticsRangeProvider = StateProvider<String>((ref) => '7D');

final linkAnalyticsProvider = FutureProvider.family<AnalyticsData, String>((ref, id) async {
  final range = ref.watch(analyticsRangeProvider);
  final dio = ref.watch(dioProvider);
  try {
    await dio.get<Map<String, dynamic>>(
      ApiEndpoints.linkAnalytics(id),
      queryParameters: <String, dynamic>{'range': range},
    );
  } on DioException {
    if (!AppConfig.useSampleData) rethrow;
    await Future<void>.delayed(const Duration(milliseconds: 450));
  }
  if (!AppConfig.useSampleData) {
    throw StateError('Unexpected analytics response.');
  }
  return sampleAnalytics;
});
