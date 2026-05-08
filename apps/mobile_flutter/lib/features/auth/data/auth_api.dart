import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../domain/user_model.dart';

final authApiProvider = Provider<AuthApi>((ref) => AuthApi(ref.watch(dioProvider)));

class AuthApi {
  const AuthApi(this._dio);

  final Dio _dio;

  Future<AuthSession> login(String email, String password) async {
    final response = await _dio.post<Map<String, dynamic>>(
      ApiEndpoints.authLogin,
      data: <String, dynamic>{'email': email.trim(), 'password': password},
    );
    return AuthSession.fromJson(_data(response));
  }

  Future<UserModel> register(String name, String email, String password) async {
    await _dio.post<Map<String, dynamic>>(
      ApiEndpoints.authRegister,
      data: <String, dynamic>{'email': email.trim(), 'password': password},
    );
    return UserModel(
      id: '',
      name: name.trim().isEmpty ? 'LinkSnap User' : name.trim(),
      email: email.trim(),
      plan: 'FREE',
    );
  }

  Future<void> verifyEmail(String email, String otp) async {
    await _dio.post<Map<String, dynamic>>(
      ApiEndpoints.authVerify,
      data: <String, dynamic>{'email': email.trim(), 'otp': otp.trim()},
    );
  }

  Future<void> forgotPassword(String email) async {
    await _dio.post<Map<String, dynamic>>(
      ApiEndpoints.authForgotPassword,
      data: <String, dynamic>{'email': email.trim()},
    );
  }

  Future<void> resetPassword(String token, String password) async {
    await _dio.post<Map<String, dynamic>>(
      ApiEndpoints.authResetPassword,
      data: <String, dynamic>{'token': token, 'password': password},
    );
  }

  Future<void> resendOtp(String email) async {
    await _dio.post<Map<String, dynamic>>(
      ApiEndpoints.authResendOtp,
      data: <String, dynamic>{'email': email.trim()},
    );
  }

  Future<void> logout(String? refreshToken) async {
    await _dio.post<Map<String, dynamic>>(
      ApiEndpoints.authLogout,
      data: <String, dynamic>{
        if (refreshToken != null && refreshToken.isNotEmpty) 'refreshToken': refreshToken,
      },
    );
  }

  Map<String, dynamic> _data(Response<Map<String, dynamic>> response) {
    final body = response.data ?? <String, dynamic>{};
    if (body['success'] == false) {
      final apiError = body['error'];
      final message = apiError is Map ? apiError['message'] : null;
      throw StateError(message?.toString() ?? 'API request failed.');
    }
    final data = body['data'];
    if (data is Map<String, dynamic>) return data;
    if (data is Map) return data.cast<String, dynamic>();
    return body;
  }
}
