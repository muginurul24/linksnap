import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/validators.dart';
import '../../../../shared/widgets/app_widgets.dart';
import '../providers/auth_provider.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);
    return AppScaffold(
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: <Widget>[
                ShaderMask(
                  shaderCallback: (bounds) => const LinearGradient(
                    colors: <Color>[AppColors.accent300, AppColors.accent600],
                  ).createShader(bounds),
                  child: Text(
                    'LinkSnap',
                    style: Theme.of(context).textTheme.displayLarge?.copyWith(color: Colors.white),
                  ),
                ),
                const SizedBox(height: 4),
                Text('Smart links for serious growth teams.', style: Theme.of(context).textTheme.bodyMedium),
                const SizedBox(height: 40),
                AppCard(
                  variant: AppCardVariant.glass,
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    children: <Widget>[
                      AppInput(
                        label: 'Email',
                        hint: 'you@company.com',
                        prefixIcon: Icons.mail_outline,
                        keyboardType: TextInputType.emailAddress,
                        controller: _emailController,
                        validator: Validators.email,
                      ),
                      const SizedBox(height: 20),
                      AppInput(
                        label: 'Password',
                        hint: 'Enter password',
                        prefixIcon: Icons.lock_outline,
                        obscure: true,
                        controller: _passwordController,
                        validator: Validators.password,
                      ),
                      const SizedBox(height: 8),
                      Align(
                        alignment: Alignment.centerRight,
                        child: TextButton(
                          onPressed: () {
                            HapticFeedback.lightImpact();
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Password reset flow is ready through the API.')),
                            );
                          },
                          child: const Text(
                            'Forgot password?',
                            style: TextStyle(color: AppColors.accent, fontWeight: FontWeight.w600, fontSize: 13),
                          ),
                        ),
                      ),
                      if (auth.error != null) ...<Widget>[
                        const SizedBox(height: 8),
                        Text(auth.error!, style: const TextStyle(color: AppColors.error, fontSize: 14)),
                      ].animate().shakeX(duration: 350.ms, amount: 4),
                      const SizedBox(height: 16),
                      AppButton(
                        label: 'Sign In',
                        loading: auth.isLoading,
                        onPressed: _submit,
                      ),
                      const SizedBox(height: 24),
                      Row(
                        children: <Widget>[
                          const Expanded(child: Divider()),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                            child: Text('or continue with', style: Theme.of(context).textTheme.labelSmall),
                          ),
                          const Expanded(child: Divider()),
                        ],
                      ),
                      const SizedBox(height: 20),
                      AppButton(
                        label: 'Google',
                        icon: Icons.g_mobiledata,
                        onPressed: () {
                          HapticFeedback.lightImpact();
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Continue with Google from the web OAuth endpoint.')),
                          );
                        },
                        variant: AppButtonVariant.secondary,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                AppButton(
                  label: "Don't have an account? Sign up",
                  variant: AppButtonVariant.ghost,
                  onPressed: () => context.go('/register'),
                ),
              ],
            ).animate().fadeIn(duration: 300.ms).slideY(begin: 0.04),
          ),
        ),
      ),
    );
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    await ref.read(authProvider.notifier).login(
          _emailController.text,
          _passwordController.text,
        );
  }
}
