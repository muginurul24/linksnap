import 'package:flutter_test/flutter_test.dart';
import 'package:linksnap_mobile/core/config/app_config.dart';

void main() {
  group('AppConfig', () {
    test('should default API base URL to the production domain when env is absent', () {
      expect(AppConfig.apiBaseUrl, 'https://www.justqiu.cloud');
    });

    test('should build encoded short-link URLs from the configured public domain', () {
      expect(
        AppConfig.shortLinkUri('promo id').toString(),
        'https://www.justqiu.cloud/promo%20id',
      );
    });

    test('should expose display-safe short-link text without scheme', () {
      expect(AppConfig.shortLinkDisplay('promo'), 'www.justqiu.cloud/promo');
    });
  });
}
