import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../config/app_config.dart';
import '../storage/secure_storage.dart';
import 'api_endpoints.dart';

final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient(storage: ref.watch(secureStorageProvider));
});

final dioProvider = Provider<Dio>((ref) => ref.watch(apiClientProvider).dio);

class ApiClient {
  ApiClient({required SecureStorage storage}) : _storage = storage {
    dio = Dio(
      BaseOptions(
        baseUrl: AppConfig.apiBaseUrl,
        connectTimeout: const Duration(seconds: 30),
        receiveTimeout: const Duration(seconds: 30),
        sendTimeout: const Duration(seconds: 30),
        headers: const <String, Object?>{
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
      ),
    );
    dio.interceptors.add(_AuthInterceptor(dio: dio, storage: _storage));
    dio.interceptors.add(_RetryInterceptor(dio: dio));
    if (kDebugMode) {
      dio.interceptors.add(
        LogInterceptor(
          requestBody: false,
          responseBody: false,
          requestHeader: false,
          responseHeader: false,
          logPrint: (object) => debugPrint(object.toString()),
        ),
      );
    }
  }

  final SecureStorage _storage;
  late final Dio dio;
}

class _AuthInterceptor extends Interceptor {
  _AuthInterceptor({required this.dio, required this.storage});

  final Dio dio;
  final SecureStorage storage;
  Future<String?>? _refreshing;

  @override
  Future<void> onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    if (options.extra['skipAuth'] == true) {
      options.headers.remove('Authorization');
      handler.next(options);
      return;
    }

    final token = await storage.getToken();
    if (token != null && token.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  Future<void> onError(DioException err, ErrorInterceptorHandler handler) async {
    final statusCode = err.response?.statusCode;
    final isRefreshCall = err.requestOptions.path == ApiEndpoints.authRefresh;
    if (statusCode != 401 || isRefreshCall || err.requestOptions.extra['skipAuth'] == true) {
      handler.next(err);
      return;
    }

    try {
      final token = await _refreshTokenOnce();
      if (token == null) {
        await storage.clearSession();
        handler.next(err);
        return;
      }
      final retryOptions = err.requestOptions;
      retryOptions.headers['Authorization'] = 'Bearer $token';
      final response = await dio.fetch<dynamic>(retryOptions);
      handler.resolve(response);
    } catch (_) {
      await storage.clearSession();
      handler.next(err);
    }
  }

  Future<String?> _refreshTokenOnce() async {
    final existing = _refreshing;
    if (existing != null) return existing;

    final next = _refreshToken();
    _refreshing = next;
    try {
      return await next;
    } finally {
      if (identical(_refreshing, next)) {
        _refreshing = null;
      }
    }
  }

  Future<String?> _refreshToken() async {
    final refreshToken = await storage.getRefreshToken();
    if (refreshToken == null || refreshToken.isEmpty) {
      return null;
    }
    final response = await dio.post<Map<String, dynamic>>(
      ApiEndpoints.authRefresh,
      data: <String, dynamic>{'refreshToken': refreshToken},
      options: Options(
        headers: <String, dynamic>{'Authorization': null},
        extra: <String, dynamic>{'allowRetry': false, 'skipAuth': true},
      ),
    );
    final data = response.data?['data'] as Map<String, dynamic>?;
    final accessToken = data?['token'] as String?;
    final nextRefreshToken = data?['refreshToken'] as String?;
    if (accessToken != null) {
      await storage.saveToken(accessToken);
    }
    if (nextRefreshToken != null) {
      await storage.saveRefreshToken(nextRefreshToken);
    }
    return accessToken;
  }
}

class _RetryInterceptor extends Interceptor {
  _RetryInterceptor({required this.dio});

  final Dio dio;

  @override
  Future<void> onError(DioException err, ErrorInterceptorHandler handler) async {
    final statusCode = err.response?.statusCode ?? 0;
    final request = err.requestOptions;
    final retries = request.extra['retryCount'] as int? ?? 0;
    if (!_shouldRetry(err) || retries >= 3) {
      handler.next(err);
      return;
    }

    await Future<void>.delayed(Duration(milliseconds: 300 * (1 << retries)));
    request.extra['retryCount'] = retries + 1;
    try {
      final response = await dio.fetch<dynamic>(request);
      handler.resolve(response);
    } catch (_) {
      handler.next(err);
    }
  }

  bool _shouldRetry(DioException err) {
    final request = err.requestOptions;
    final explicitlyAllowed = request.extra['allowRetry'] == true;
    final method = request.method.toUpperCase();
    final safeMethod = method == 'GET' || method == 'HEAD' || method == 'OPTIONS';
    if (!explicitlyAllowed && !safeMethod) return false;

    final statusCode = err.response?.statusCode ?? 0;
    if (statusCode >= 500) return true;

    return err.type == DioExceptionType.connectionTimeout ||
        err.type == DioExceptionType.receiveTimeout ||
        err.type == DioExceptionType.sendTimeout ||
        err.type == DioExceptionType.connectionError;
  }
}
