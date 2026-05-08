import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:local_auth/local_auth.dart';

final secureStorageProvider = Provider<SecureStorage>((ref) => SecureStorage());

class SecureStorage {
  SecureStorage({
    LocalAuthentication? localAuth,
    FlutterSecureStorage? storage,
  })  : _localAuth = localAuth ?? LocalAuthentication(),
        _storage = storage ?? const FlutterSecureStorage();

  final LocalAuthentication _localAuth;
  final FlutterSecureStorage _storage;

  static const _accessTokenKey = 'linksnap.access_token';
  static const _refreshTokenKey = 'linksnap.refresh_token';
  static const _userKey = 'linksnap.user';
  static const _hapticsKey = 'linksnap.haptics_enabled';
  static const _biometricKey = 'linksnap.biometric_enabled';

  IOSOptions get _iosOptions => const IOSOptions(
        accessibility: KeychainAccessibility.first_unlock_this_device,
      );

  AndroidOptions get _androidOptions => const AndroidOptions(
        encryptedSharedPreferences: true,
      );

  Future<void> saveToken(String token) async {
    await _storage.write(
      key: _accessTokenKey,
      value: token,
      iOptions: _iosOptions,
      aOptions: _androidOptions,
    );
  }

  Future<String?> getToken({bool biometric = false}) async {
    if (biometric && !await _authorizeBiometricRead()) {
      return null;
    }

    return _storage.read(
      key: _accessTokenKey,
      iOptions: _iosOptions,
      aOptions: _androidOptions,
    );
  }

  Future<void> deleteToken() async {
    await _storage.delete(
      key: _accessTokenKey,
      iOptions: _iosOptions,
      aOptions: _androidOptions,
    );
  }

  Future<void> saveRefreshToken(String token) async {
    await _storage.write(
      key: _refreshTokenKey,
      value: token,
      iOptions: _iosOptions,
      aOptions: _androidOptions,
    );
  }

  Future<String?> getRefreshToken() async {
    return _storage.read(
      key: _refreshTokenKey,
      iOptions: _iosOptions,
      aOptions: _androidOptions,
    );
  }

  Future<void> deleteRefreshToken() async {
    await _storage.delete(
      key: _refreshTokenKey,
      iOptions: _iosOptions,
      aOptions: _androidOptions,
    );
  }

  Future<void> saveUserJson(String json) async {
    await _storage.write(
      key: _userKey,
      value: json,
      iOptions: _iosOptions,
      aOptions: _androidOptions,
    );
  }

  Future<String?> getUserJson({bool biometric = false}) async {
    if (biometric && !await _authorizeBiometricRead()) {
      return null;
    }

    return _storage.read(
      key: _userKey,
      iOptions: _iosOptions,
      aOptions: _androidOptions,
    );
  }

  Future<void> setHapticsEnabled({required bool enabled}) async {
    await _storage.write(key: _hapticsKey, value: enabled ? 'true' : 'false');
  }

  Future<bool> getHapticsEnabled() async {
    return (await _storage.read(key: _hapticsKey)) != 'false';
  }

  Future<void> setBiometricEnabled({required bool enabled}) async {
    await _storage.write(key: _biometricKey, value: enabled ? 'true' : 'false');
  }

  Future<bool> getBiometricEnabled() async {
    return (await _storage.read(key: _biometricKey)) == 'true';
  }

  Future<bool> _authorizeBiometricRead() async {
    if (!await getBiometricEnabled()) return true;

    try {
      final isSupported = await _localAuth.isDeviceSupported();
      final canCheck = await _localAuth.canCheckBiometrics;
      if (!isSupported && !canCheck) return false;

      return _localAuth.authenticate(
        localizedReason: 'Unlock LinkSnap to continue',
        options: const AuthenticationOptions(
          biometricOnly: false,
          stickyAuth: true,
        ),
      );
    } catch (_) {
      return false;
    }
  }

  Future<void> clearSession() async {
    await Future.wait(<Future<void>>[
      deleteToken(),
      deleteRefreshToken(),
      _storage.delete(key: _userKey, iOptions: _iosOptions, aOptions: _androidOptions),
    ]);
  }
}
