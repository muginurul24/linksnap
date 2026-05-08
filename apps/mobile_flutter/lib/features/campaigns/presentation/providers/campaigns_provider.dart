import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/config/app_config.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/network/api_endpoints.dart';
import '../../../../shared/models/app_models.dart';

final campaignsProvider = FutureProvider<List<CampaignModel>>((ref) async {
  final dio = ref.watch(dioProvider);
  try {
    final response = await dio.get<Map<String, dynamic>>(ApiEndpoints.campaigns);
    final data = response.data?['data'];
    final items = data is List ? data : (data as Map?)?['items'];
    if (items is List) {
      return items.map((item) => CampaignModel.fromJson((item as Map).cast<String, dynamic>())).toList();
    }
  } on DioException {
    if (!AppConfig.useSampleData) rethrow;
    await Future<void>.delayed(const Duration(milliseconds: 400));
  }
  if (!AppConfig.useSampleData) {
    throw StateError('Unexpected campaigns response.');
  }
  return sampleCampaigns;
});
