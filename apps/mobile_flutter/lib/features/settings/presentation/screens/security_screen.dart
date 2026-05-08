import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../../../shared/widgets/app_widgets.dart';

class SecurityScreen extends StatefulWidget {
  const SecurityScreen({super.key});

  @override
  State<SecurityScreen> createState() => _SecurityScreenState();
}

class _SecurityScreenState extends State<SecurityScreen> {
  final _currentController = TextEditingController();
  final _nextController = TextEditingController();
  bool _twoFactor = false;
  bool _saving = false;

  @override
  void dispose() {
    _currentController.dispose();
    _nextController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      title: 'Security',
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
        children: <Widget>[
          AppCard(
            variant: AppCardVariant.glass,
            child: Column(
              children: <Widget>[
                AppInput(label: 'Current password', controller: _currentController, prefixIcon: Icons.lock_outline, obscure: true),
                const SizedBox(height: 16),
                AppInput(label: 'New password', controller: _nextController, prefixIcon: Icons.password, obscure: true),
                const SizedBox(height: 18),
                AppButton(label: 'Change Password', loading: _saving, onPressed: _save),
              ],
            ),
          ).animate().fadeIn(duration: 300.ms).slideY(begin: 0.04),
          const SizedBox(height: 18),
          PremiumSwitchTile(
            title: 'Two-factor authentication',
            subtitle: 'Require an OTP for sensitive actions.',
            value: _twoFactor,
            onChanged: (value) => setState(() => _twoFactor = value),
          ),
          const SizedBox(height: 18),
          _twoFactor
              ? AppCard(
                  variant: AppCardVariant.accent,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Text('2FA Setup', style: Theme.of(context).textTheme.titleLarge),
                      const SizedBox(height: 10),
                      const QrDisplay(data: 'otpauth://totp/LinkSnap:account?issuer=LinkSnap'),
                    ],
                  ),
                )
              : const EmptyState(title: '2FA is off', description: 'Turn it on to protect account changes.', icon: Icons.security),
        ],
      ),
    );
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    await Future<void>.delayed(const Duration(milliseconds: 450));
    HapticFeedback.lightImpact();
    if (mounted) setState(() => _saving = false);
  }
}
