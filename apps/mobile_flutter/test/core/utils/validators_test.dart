import 'package:flutter_test/flutter_test.dart';
import 'package:linksnap_mobile/core/utils/validators.dart';

void main() {
  group('Validators.email', () {
    test('should accept valid email addresses when trimmed', () {
      expect(Validators.email(' rafi@example.com '), isNull);
    });

    test('should reject blank or malformed email addresses', () {
      expect(Validators.email(''), 'Email is required');
      expect(Validators.email('not-an-email'), 'Enter a valid email address');
    });
  });

  group('Validators.password', () {
    test('should require length, a letter, and a number', () {
      expect(Validators.password('short1'), 'Use at least 8 characters');
      expect(Validators.password('12345678'), 'Include at least one letter');
      expect(Validators.password('Password'), 'Include at least one number');
      expect(Validators.password('Password1'), isNull);
    });
  });

  group('Validators.url', () {
    test('should accept HTTP and HTTPS URLs', () {
      expect(Validators.url('https://example.com/path'), isNull);
      expect(Validators.url('http://example.com/path'), isNull);
    });

    test('should reject missing or unsupported URL schemes', () {
      expect(Validators.url('example.com'), 'Enter a valid URL');
      expect(Validators.url('ftp://example.com'), 'URL must start with http or https');
    });
  });
}
