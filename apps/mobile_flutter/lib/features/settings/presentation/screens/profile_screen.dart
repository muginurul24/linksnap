import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/app_widgets.dart';
import '../../../auth/presentation/providers/auth_provider.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _picker = ImagePicker();
  bool _saving = false;
  String? _avatarPath;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);
    final user = auth.user;
    if (user != null && _nameController.text.isEmpty) {
      _nameController.text = user.name;
      _emailController.text = user.email;
    }
    return AppScaffold(
      title: 'Profile',
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
        children: <Widget>[
          if (auth.isLoading)
            const ShimmerLoader(variant: ShimmerVariant.card)
          else if (auth.error != null)
            ErrorStateWidget(message: auth.error!, onRetry: () => ref.read(authProvider.notifier).checkAuth())
          else if (user == null)
            const EmptyState(title: 'No profile loaded', icon: Icons.person_off)
          else
            AppCard(
              variant: AppCardVariant.glass,
              child: Column(
                children: <Widget>[
                  AppCard(
                    variant: AppCardVariant.accent,
                    padding: const EdgeInsets.all(4),
                    onTap: _pickAvatar,
                    child: CircleAvatar(
                      radius: 42,
                      backgroundColor: AppColors.surface100,
                      backgroundImage: _avatarPath == null ? null : FileImage(File(_avatarPath!)),
                      child: _avatarPath == null ? Text((user.name.isEmpty ? 'L' : user.name[0]).toUpperCase(), style: const TextStyle(color: AppColors.accent, fontSize: 32, fontWeight: FontWeight.w800)) : null,
                    ),
                  ),
                  const SizedBox(height: 20),
                  AppInput(label: 'Name', controller: _nameController, prefixIcon: Icons.person_outline),
                  const SizedBox(height: 16),
                  AppInput(label: 'Email', controller: _emailController, prefixIcon: Icons.mail_outline, keyboardType: TextInputType.emailAddress),
                  const SizedBox(height: 22),
                  AppButton(label: 'Save Profile', loading: _saving, onPressed: _save),
                ],
              ),
            ).animate().fadeIn(duration: 300.ms).slideY(begin: 0.04),
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

  Future<void> _pickAvatar() async {
    HapticFeedback.lightImpact();
    final image = await _picker.pickImage(source: ImageSource.gallery, maxWidth: 512, maxHeight: 512, imageQuality: 88);
    if (image != null && mounted) {
      setState(() => _avatarPath = image.path);
    }
  }
}
