import 'package:flutter/foundation.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

class AppConfig {
  AppConfig._();

  static const _defaultApiBaseUrl = 'https://www.justqiu.cloud';
  static const _defaultShortLinkBaseUrl = 'https://www.justqiu.cloud';

  static const _apiBaseUrlFromDefine = String.fromEnvironment('LINKSNAP_API_BASE_URL');
  static const _shortLinkBaseUrlFromDefine = String.fromEnvironment('LINKSNAP_SHORT_LINK_BASE_URL');
  static const _useSampleDataFromDefine = String.fromEnvironment('LINKSNAP_USE_SAMPLE_DATA');

  static String get apiBaseUrl {
    return _normalizedBaseUrl(
      _firstNonBlank(<String>[
        _apiBaseUrlFromDefine,
        dotenv.maybeGet('API_BASE_URL', fallback: ''),
        _defaultApiBaseUrl,
      ]),
      settingName: 'API_BASE_URL',
    );
  }

  static String get shortLinkBaseUrl {
    return _normalizedBaseUrl(
      _firstNonBlank(<String>[
        _shortLinkBaseUrlFromDefine,
        dotenv.maybeGet('SHORT_LINK_BASE_URL', fallback: ''),
        dotenv.maybeGet('PUBLIC_APP_URL', fallback: ''),
        _defaultShortLinkBaseUrl,
      ]),
      settingName: 'SHORT_LINK_BASE_URL',
    );
  }

  static bool get useSampleData {
    final raw = _firstNonBlank(<String>[
      _useSampleDataFromDefine,
      dotenv.maybeGet('USE_SAMPLE_DATA', fallback: ''),
    ]).toLowerCase();
    return raw == '1' || raw == 'true' || raw == 'yes';
  }

  static Uri shortLinkUri(String slug) {
    return Uri.parse('${shortLinkBaseUrl}/${Uri.encodeComponent(slug)}');
  }

  static String shortLinkDisplay(String slug) {
    final uri = Uri.parse(shortLinkBaseUrl);
    return '${uri.host}/$slug';
  }

  static String _firstNonBlank(List<String> values) {
    for (final value in values) {
      final trimmed = value.trim();
      if (trimmed.isNotEmpty) return trimmed;
    }
    return '';
  }

  static String _normalizedBaseUrl(String raw, {required String settingName}) {
    final parsed = Uri.tryParse(raw.trim());
    final invalid = parsed == null || !parsed.hasScheme || parsed.host.isEmpty;
    if (invalid) {
      throw StateError('$settingName must be a valid absolute URL.');
    }

    final isLocalDebugHost = kDebugMode &&
        parsed.scheme == 'http' &&
        <String>{'localhost', '127.0.0.1', '10.0.2.2'}.contains(parsed.host);
    if (parsed.scheme != 'https' && !isLocalDebugHost) {
      throw StateError('$settingName must use https outside local debug hosts.');
    }

    final normalized = parsed.replace(path: _trimTrailingSlash(parsed.path), query: null, fragment: null);
    return normalized.toString().replaceFirst(RegExp(r'/$'), '');
  }

  static String _trimTrailingSlash(String path) {
    if (path == '/' || path.isEmpty) return '';
    return path.replaceFirst(RegExp(r'/+$'), '');
  }
}
