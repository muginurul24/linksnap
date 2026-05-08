import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/services.dart';

import '../../data/auth_repository.dart';
import '../../domain/user_model.dart';

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref.watch(authRepositoryProvider));
});

class AuthState {
  const AuthState({
    this.user,
    this.token,
    this.isLoading = false,
    this.error,
  });

  final UserModel? user;
  final String? token;
  final bool isLoading;
  final String? error;

  bool get isAuthenticated => user != null && token != null && token!.isNotEmpty;

  AuthState copyWith({
    UserModel? user,
    String? token,
    bool? isLoading,
    String? error,
    bool clearError = false,
    bool clearSession = false,
  }) {
    return AuthState(
      user: clearSession ? null : user ?? this.user,
      token: clearSession ? null : token ?? this.token,
      isLoading: isLoading ?? this.isLoading,
      error: clearError ? null : error ?? this.error,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier(this._repository) : super(const AuthState(isLoading: true)) {
    checkAuth();
  }

  final AuthRepository _repository;

  Future<void> checkAuth({bool promptBiometric = false}) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final (token, user) = await _repository.readSession(biometric: promptBiometric);
      if (token == null || user == null || _isExpired(token)) {
        await _repository.logout();
        state = const AuthState();
        return;
      }
      if (promptBiometric) {
        HapticFeedback.lightImpact();
      }
      state = AuthState(user: user, token: token);
    } catch (error) {
      state = AuthState(error: error.toString());
    }
  }

  Future<void> login(String email, String password) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final session = await _repository.login(email, password);
      HapticFeedback.lightImpact();
      state = AuthState(user: session.user, token: session.token);
    } catch (error) {
      state = state.copyWith(isLoading: false, error: _message(error));
    }
  }

  Future<UserModel?> register(String name, String email, String password) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final user = await _repository.register(name, email, password);
      HapticFeedback.lightImpact();
      state = state.copyWith(isLoading: false, user: user);
      return user;
    } catch (error) {
      state = state.copyWith(isLoading: false, error: _message(error));
      return null;
    }
  }

  Future<void> verifyEmail(String email, String otp) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final session = await _repository.verifyEmail(email, otp);
      HapticFeedback.lightImpact();
      state = AuthState(user: session.user, token: session.token);
    } catch (error) {
      state = state.copyWith(isLoading: false, error: _message(error));
    }
  }

  Future<void> logout() async {
    await _repository.logout();
    HapticFeedback.lightImpact();
    state = const AuthState();
  }

  bool _isExpired(String token) {
    final parts = token.split('.');
    if (parts.length != 3) return false;
    try {
      final payload = utf8.decode(base64Url.decode(base64Url.normalize(parts[1])));
      final json = jsonDecode(payload) as Map<String, dynamic>;
      final issuedAt = json['iat'];
      if (issuedAt is! num) return false;
      final issued = DateTime.fromMillisecondsSinceEpoch(issuedAt.toInt() * 1000);
      return DateTime.now().difference(issued) > const Duration(days: 7);
    } catch (_) {
      return false;
    }
  }

  String _message(Object error) {
    final raw = error.toString();
    if (raw.contains('401')) return 'Invalid email or password';
    if (raw.contains('429')) return 'Too many attempts. Please try again soon.';
    return 'Something went wrong. Please try again.';
  }
}
