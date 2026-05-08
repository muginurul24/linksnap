class Validators {
  Validators._();

  static String? required(String? value, {String label = 'This field'}) {
    if (value == null || value.trim().isEmpty) {
      return '$label is required';
    }
    return null;
  }

  static String? email(String? value) {
    final requiredError = required(value, label: 'Email');
    if (requiredError != null) return requiredError;
    final valid = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(value!.trim());
    return valid ? null : 'Enter a valid email address';
  }

  static String? password(String? value) {
    final requiredError = required(value, label: 'Password');
    if (requiredError != null) return requiredError;
    if (value!.length < 8) return 'Use at least 8 characters';
    if (!RegExp('[A-Za-z]').hasMatch(value)) return 'Include at least one letter';
    if (!RegExp(r'\d').hasMatch(value)) return 'Include at least one number';
    return null;
  }

  static String? url(String? value) {
    final requiredError = required(value, label: 'URL');
    if (requiredError != null) return requiredError;
    final parsed = Uri.tryParse(value!.trim());
    if (parsed == null || !parsed.hasScheme || parsed.host.isEmpty) {
      return 'Enter a valid URL';
    }
    if (parsed.scheme != 'https' && parsed.scheme != 'http') {
      return 'URL must start with http or https';
    }
    return null;
  }

  static bool isValidUrl(String value) => url(value) == null;

  static int passwordStrength(String value) {
    var score = 0;
    if (value.length >= 8) score++;
    if (RegExp('[A-Z]').hasMatch(value) && RegExp('[a-z]').hasMatch(value)) score++;
    if (RegExp(r'\d').hasMatch(value) && RegExp(r'[^A-Za-z0-9]').hasMatch(value)) score++;
    return score.clamp(0, 3);
  }
}
