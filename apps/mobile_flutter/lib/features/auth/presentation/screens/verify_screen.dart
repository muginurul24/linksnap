import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/app_widgets.dart';
import '../providers/auth_provider.dart';

class VerifyScreen extends ConsumerStatefulWidget {
  const VerifyScreen({super.key, this.email, this.token});

  final String? email;
  final String? token;

  @override
  ConsumerState<VerifyScreen> createState() => _VerifyScreenState();
}

class _VerifyScreenState extends ConsumerState<VerifyScreen> {
  late final List<TextEditingController> _controllers;
  late final List<FocusNode> _focusNodes;
  Timer? _timer;
  int _seconds = 60;

  @override
  void initState() {
    super.initState();
    _controllers = List<TextEditingController>.generate(6, (_) => TextEditingController());
    _focusNodes = List<FocusNode>.generate(6, (_) => FocusNode());
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (_seconds > 0 && mounted) setState(() => _seconds--);
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    for (final controller in _controllers) {
      controller.dispose();
    }
    for (final focusNode in _focusNodes) {
      focusNode.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);
    final email = widget.email ?? 'your email';
    return AppScaffold(
      title: 'Verify Email',
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
          child: AppCard(
            variant: AppCardVariant.glass,
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                const Icon(Icons.mark_email_read_outlined, color: AppColors.accent, size: 52),
                const SizedBox(height: 18),
                Text('Enter verification code', style: Theme.of(context).textTheme.headlineMedium, textAlign: TextAlign.center),
                const SizedBox(height: 8),
                Text('We sent a 6-digit code to $email.', style: Theme.of(context).textTheme.bodyMedium, textAlign: TextAlign.center),
                const SizedBox(height: 26),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List<Widget>.generate(6, _otpField),
                ),
                if (auth.error != null) ...<Widget>[
                  const SizedBox(height: 16),
                  Text(auth.error!, style: const TextStyle(color: AppColors.error, fontSize: 14)),
                ].animate().shakeX(duration: 350.ms, amount: 4),
                const SizedBox(height: 24),
                AppButton(
                  label: 'Verify',
                  loading: auth.isLoading,
                  onPressed: _submit,
                ),
                const SizedBox(height: 16),
                AppButton(
                  label: _seconds == 0 ? 'Resend code' : 'Resend in ${_seconds}s',
                  variant: AppButtonVariant.ghost,
                  onPressed: _seconds == 0
                      ? () {
                          HapticFeedback.lightImpact();
                          setState(() => _seconds = 60);
                        }
                      : null,
                ),
              ],
            ),
          ).animate().fadeIn(duration: 300.ms).slideY(begin: 0.04),
        ),
      ),
    );
  }

  Widget _otpField(int index) {
    return Container(
      width: 44,
      height: 56,
      margin: EdgeInsets.only(right: index == 5 ? 0 : 8),
      child: TextField(
        controller: _controllers[index],
        focusNode: _focusNodes[index],
        keyboardType: TextInputType.number,
        textAlign: TextAlign.center,
        maxLength: 1,
        style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
        inputFormatters: <TextInputFormatter>[FilteringTextInputFormatter.digitsOnly],
        decoration: const InputDecoration(counterText: ''),
        onChanged: (value) {
          HapticFeedback.lightImpact();
          if (value.isNotEmpty && index < 5) {
            _focusNodes[index + 1].requestFocus();
          }
          if (value.isEmpty && index > 0) {
            _focusNodes[index - 1].requestFocus();
          }
        },
      ),
    );
  }

  Future<void> _submit() async {
    final otp = _controllers.map((controller) => controller.text).join();
    if (otp.length != 6 || widget.email == null) return;
    final verified = await ref
        .read(authProvider.notifier)
        .verifyEmail(widget.email!, otp);
    if (mounted && verified) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Email verified. Sign in to continue.')),
      );
      context.go('/login');
    }
  }
}
