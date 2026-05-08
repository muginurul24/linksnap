import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/validators.dart';
import '../../../../shared/widgets/app_widgets.dart';
import '../providers/auth_provider.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmController = TextEditingController();
  bool _acceptedTerms = false;
  int _strength = 0;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);
    return AppScaffold(
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              const SizedBox(height: 12),
              ShaderMask(
                shaderCallback: (bounds) => const LinearGradient(
                  colors: <Color>[AppColors.accent300, AppColors.accent600],
                ).createShader(bounds),
                child: Text(
                  'Create Account',
                  style: Theme.of(context).textTheme.headlineLarge?.copyWith(color: Colors.white),
                ),
              ),
              const SizedBox(height: 6),
              Text('Launch premium links with secure email verification.', style: Theme.of(context).textTheme.bodyMedium),
              const SizedBox(height: 28),
              AppCard(
                variant: AppCardVariant.glass,
                padding: const EdgeInsets.all(24),
                child: Column(
                  children: <Widget>[
                    AppInput(
                      label: 'Name',
                      hint: 'Rafi',
                      prefixIcon: Icons.person_outline,
                      controller: _nameController,
                      validator: (value) => Validators.required(value, label: 'Name'),
                    ),
                    const SizedBox(height: 18),
                    AppInput(
                      label: 'Email',
                      hint: 'you@company.com',
                      prefixIcon: Icons.mail_outline,
                      keyboardType: TextInputType.emailAddress,
                      controller: _emailController,
                      validator: Validators.email,
                    ),
                    const SizedBox(height: 18),
                    AppInput(
                      label: 'Password',
                      hint: 'Minimum 8 characters',
                      prefixIcon: Icons.lock_outline,
                      obscure: true,
                      controller: _passwordController,
                      validator: Validators.password,
                      onChanged: (value) => setState(() => _strength = Validators.passwordStrength(value)),
                    ),
                    const SizedBox(height: 12),
                    _PasswordStrength(strength: _strength),
                    const SizedBox(height: 12),
                    _PasswordChecklist(password: _passwordController.text),
                    const SizedBox(height: 18),
                    AppInput(
                      label: 'Confirm Password',
                      hint: 'Repeat password',
                      prefixIcon: Icons.verified_user_outlined,
                      obscure: true,
                      controller: _confirmController,
                      validator: (value) {
                        if (value != _passwordController.text) return 'Passwords do not match';
                        return null;
                      },
                    ),
                    const SizedBox(height: 18),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Checkbox(
                          value: _acceptedTerms,
                          activeColor: AppColors.accent,
                          onChanged: (value) {
                            HapticFeedback.lightImpact();
                            setState(() => _acceptedTerms = value ?? false);
                          },
                        ),
                        Expanded(
                          child: Padding(
                            padding: const EdgeInsets.only(top: 12),
                            child: RichText(
                              text: TextSpan(
                                style: Theme.of(context).textTheme.bodyMedium,
                                children: <InlineSpan>[
                                  const TextSpan(text: 'I agree to the '),
                                  TextSpan(
                                    text: 'Terms',
                                    style: const TextStyle(color: AppColors.accent, fontWeight: FontWeight.w700),
                                    recognizer: TapGestureRecognizer()
                                      ..onTap = () {
                                        HapticFeedback.lightImpact();
                                      },
                                  ),
                                  const TextSpan(text: ' and Privacy Policy.'),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                    if (auth.error != null) ...<Widget>[
                      const SizedBox(height: 8),
                      Text(auth.error!, style: const TextStyle(color: AppColors.error, fontSize: 14)),
                    ].animate().shakeX(duration: 350.ms, amount: 4),
                    const SizedBox(height: 18),
                    AppButton(
                      label: 'Create Account',
                      loading: auth.isLoading,
                      onPressed: _acceptedTerms ? _submit : null,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              AppButton(
                label: 'Already have an account? Sign in',
                variant: AppButtonVariant.ghost,
                onPressed: () => context.go('/login'),
              ),
            ],
          ).animate().fadeIn(duration: 300.ms).slideY(begin: 0.04),
        ),
      ),
    );
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    final user = await ref.read(authProvider.notifier).register(
          _nameController.text,
          _emailController.text,
          _passwordController.text,
        );
    if (user != null && mounted) {
      context.go('/verify?email=${Uri.encodeComponent(_emailController.text.trim())}');
    }
  }
}

class _PasswordStrength extends StatelessWidget {
  const _PasswordStrength({required this.strength});

  final int strength;

  @override
  Widget build(BuildContext context) {
    final color = switch (strength) {
      0 || 1 => AppColors.error,
      2 => AppColors.warning,
      _ => AppColors.success,
    };
    return Row(
      children: List<Widget>.generate(
        3,
        (index) => Expanded(
          child: Container(
            height: 6,
            margin: EdgeInsets.only(right: index == 2 ? 0 : 6),
            decoration: BoxDecoration(
              color: index < strength ? color : AppColors.surface300,
              borderRadius: BorderRadius.circular(99),
            ),
          ),
        ),
      ),
    );
  }
}

class _PasswordChecklist extends StatelessWidget {
  const _PasswordChecklist({required this.password});

  final String password;

  @override
  Widget build(BuildContext context) {
    final checks = <(String, bool)>[
      ('At least 8 characters', password.length >= 8),
      ('Contains a letter', RegExp('[A-Za-z]').hasMatch(password)),
      ('Contains a number', RegExp(r'\d').hasMatch(password)),
    ];
    return Column(
      children: checks
          .map(
            (check) => Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Row(
                children: <Widget>[
                  Icon(check.$2 ? Icons.check_circle : Icons.radio_button_unchecked, size: 16, color: check.$2 ? AppColors.success : AppColors.textTertiary),
                  const SizedBox(width: 8),
                  Text(check.$1, style: Theme.of(context).textTheme.bodyMedium),
                ],
              ),
            ),
          )
          .toList(),
    );
  }
}
