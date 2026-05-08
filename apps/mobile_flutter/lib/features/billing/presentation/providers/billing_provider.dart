import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/network/api_client.dart';
import '../../../../core/network/api_endpoints.dart';
import '../../../../shared/models/app_models.dart';

final billingProvider = FutureProvider<BillingOverview>((ref) async {
  final dio = ref.watch(dioProvider);
  try {
    await dio.get<Map<String, dynamic>>(ApiEndpoints.billingPlans);
  } on DioException {
    await Future<void>.delayed(const Duration(milliseconds: 400));
  }
  return sampleBilling;
});

final checkoutStatusProvider = StateProvider<String>((ref) => 'pending');
