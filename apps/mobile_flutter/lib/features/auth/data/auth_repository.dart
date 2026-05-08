import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/storage/secure_storage.dart';
import '../domain/user_model.dart';
import 'auth_api.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(
    api: ref.watch(authApiProvider),
    storage: ref.watch(secureStorageProvider),
  );
});

class AuthRepository {
  const AuthRepository({required AuthApi api, required SecureStorage storage})
      : _api = api,
        _storage = storage;

  final AuthApi _api;
  final SecureStorage _storage;

  Future<AuthSession> login(String email, String password) async {
    final session = await _api.login(email, password);
    await saveSession(session);
    return session;
  }

  Future<UserModel> register(String name, String email, String password) {
    return _api.register(name, email, password);
  }

  Future<AuthSession> verifyEmail(String email, String otp) async {
    final session = await _api.verifyEmail(email, otp);
    await saveSession(session);
    return session;
  }

  Future<void> forgotPassword(String email) => _api.forgotPassword(email);

  Future<void> resetPassword(String token, String password) => _api.resetPassword(token, password);

  Future<void> resendOtp(String email) => _api.resendOtp(email);

  Future<void> saveSession(AuthSession session) async {
    await Future.wait(<Future<void>>[
      _storage.saveToken(session.token),
      _storage.saveRefreshToken(session.refreshToken),
      _storage.saveUserJson(jsonEncode(session.user.toJson())),
    ]);
  }

  Future<(String?, UserModel?)> readSession({bool biometric = false}) async {
    final token = await _storage.getToken(biometric: biometric);
    final userJson = await _storage.getUserJson();
    if (token == null || userJson == null) return (token, null);
    try {
      final decoded = jsonDecode(userJson) as Map<String, dynamic>;
      return (token, UserModel.fromJson(decoded));
    } catch (_) {
      await _storage.clearSession();
      return (null, null);
    }
  }

  Future<void> logout() => _storage.clearSession();
}
