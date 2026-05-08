import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/config/app_config.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/network/api_endpoints.dart';
import '../../../../shared/models/app_models.dart';

final billingProvider = FutureProvider<BillingOverview>((ref) async {
  final dio = ref.watch(dioProvider);
  try {
    await dio.get<Map<String, dynamic>>(ApiEndpoints.billingPlans);
  } on DioException {
    if (!AppConfig.useSampleData) rethrow;
    await Future<void>.delayed(const Duration(milliseconds: 400));
  }
  if (!AppConfig.useSampleData) {
    throw StateError('Billing overview endpoint is not implemented for mobile.');
  }
  return sampleBilling;
});

final checkoutStatusProvider = StateProvider<String>((ref) => 'pending');
