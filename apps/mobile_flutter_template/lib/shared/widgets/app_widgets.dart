import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/theme/app_colors.dart';

// ─────────────────────────────────────────────────────────────────
// APP BUTTON — Primary (gold gradient), Secondary (outlined), Ghost
// ─────────────────────────────────────────────────────────────────

class AppButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final AppButtonVariant variant;
  final IconData? icon;
  final bool loading;
  final bool fullWidth;

  const AppButton({
    super.key,
    required this.label,
    this.onPressed,
    this.variant = AppButtonVariant.primary,
    this.icon,
    this.loading = false,
    this.fullWidth = true,
  });

  @override
  Widget build(BuildContext context) {
    final child = loading
        ? const SizedBox(
            height: 22, width: 22,
            child: CircularProgressIndicator(strokeWidth: 2.5, color: AppColors.textInverse),
          )
        : Row(
            mainAxisSize: fullWidth ? MainAxisSize.max : MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (icon != null) ...[
                Icon(icon, size: 20, color: _foregroundColor),
                const SizedBox(width: 8),
              ],
              Text(label, style: TextStyle(
                color: _foregroundColor, fontWeight: FontWeight.w600, fontSize: 16,
              )),
            ],
          );

    switch (variant) {
      case AppButtonVariant.primary:
        return SizedBox(
          width: fullWidth ? double.infinity : null,
          height: 56,
          child: Container(
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [AppColors.accent, AppColors.accent600],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                borderRadius: BorderRadius.circular(14),
                onTap: loading ? null : () {
                  HapticFeedback.lightImpact();
                  onPressed?.call();
                },
                child: Center(child: child),
              ),
            ),
          ),
        );

      case AppButtonVariant.secondary:
        return SizedBox(
          width: fullWidth ? double.infinity : null,
          height: 56,
          child: OutlinedButton(
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: AppColors.surface300),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              foregroundColor: AppColors.textPrimary,
            ),
            onPressed: loading ? null : () {
              HapticFeedback.lightImpact();
              onPressed?.call();
            },
            child: child,
          ),
        );

      case AppButtonVariant.ghost:
        return SizedBox(
          height: 48,
          child: TextButton(
            style: TextButton.styleFrom(foregroundColor: AppColors.accent),
            onPressed: loading ? null : () {
              HapticFeedback.lightImpact();
              onPressed?.call();
            },
            child: child,
          ),
        );

      case AppButtonVariant.danger:
        return SizedBox(
          width: fullWidth ? double.infinity : null,
          height: 56,
          child: Container(
            decoration: BoxDecoration(
              color: AppColors.error,
              borderRadius: BorderRadius.circular(14),
            ),
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                borderRadius: BorderRadius.circular(14),
                onTap: loading ? null : () {
                  HapticFeedback.lightImpact();
                  onPressed?.call();
                },
                child: Center(child: child),
              ),
            ),
          ),
        );
    }
  }

  Color get _foregroundColor => variant == AppButtonVariant.primary || variant == AppButtonVariant.danger
      ? AppColors.textInverse
      : variant == AppButtonVariant.ghost
          ? AppColors.accent
          : AppColors.textPrimary;
}

enum AppButtonVariant { primary, secondary, ghost, danger }

// ─────────────────────────────────────────────────────────────────
// APP CARD — Glass, Elevated, Accent variants
// ─────────────────────────────────────────────────────────────────

class AppCard extends StatelessWidget {
  final Widget child;
  final AppCardVariant variant;
  final VoidCallback? onTap;
  final EdgeInsetsGeometry? padding;
  final BorderRadiusGeometry? borderRadius;

  const AppCard({
    super.key,
    required this.child,
    this.variant = AppCardVariant.glass,
    this.onTap,
    this.padding,
    this.borderRadius,
  });

  @override
  Widget build(BuildContext context) {
    final radius = borderRadius ?? BorderRadius.circular(20);
    final pad = padding ?? const EdgeInsets.all(20);

    Widget card = _buildCard(radius, pad);

    if (onTap != null) {
      return Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: radius,
          onTap: () {
            HapticFeedback.lightImpact();
            onTap?.call();
          },
          child: card,
        ),
      );
    }
    return card;
  }

  Widget _buildCard(BorderRadiusGeometry radius, EdgeInsetsGeometry pad) {
    switch (variant) {
      case AppCardVariant.glass:
        return ClipRRect(
          borderRadius: radius,
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
            child: Container(
              decoration: BoxDecoration(
                color: AppColors.glassMedium,
                border: Border.all(color: AppColors.surface300.withOpacity(0.5)),
                borderRadius: radius,
              ),
              padding: pad,
              child: child,
            ),
          ),
        );

      case AppCardVariant.elevated:
        return Container(
          decoration: BoxDecoration(
            color: AppColors.surface100,
            border: Border.all(color: AppColors.surface300),
            borderRadius: radius,
          ),
          padding: pad,
          child: child,
        );

      case AppCardVariant.accent:
        return Container(
          decoration: BoxDecoration(
            color: AppColors.accent.withOpacity(0.08),
            border: Border.all(color: AppColors.accent.withOpacity(0.2)),
            borderRadius: radius,
          ),
          padding: pad,
          child: child,
        );
    }
  }
}

enum AppCardVariant { glass, elevated, accent }

// ─────────────────────────────────────────────────────────────────
// APP INPUT — Styled text field with icon support
// ─────────────────────────────────────────────────────────────────

class AppInput extends StatelessWidget {
  final String? label;
  final String? hint;
  final IconData? prefixIcon;
  final Widget? suffix;
  final bool obscure;
  final TextInputType? keyboardType;
  final TextEditingController? controller;
  final String? Function(String?)? validator;
  final ValueChanged<String>? onChanged;
  final bool enabled;

  const AppInput({
    super.key,
    this.label,
    this.hint,
    this.prefixIcon,
    this.suffix,
    this.obscure = false,
    this.keyboardType,
    this.controller,
    this.validator,
    this.onChanged,
    this.enabled = true,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (label != null) ...[
          Text(label!, style: Theme.of(context).textTheme.labelSmall),
          const SizedBox(height: 8),
        ],
        TextFormField(
          controller: controller,
          obscureText: obscure,
          keyboardType: keyboardType,
          validator: validator,
          onChanged: onChanged,
          enabled: enabled,
          style: const TextStyle(color: AppColors.textPrimary, fontSize: 16),
          decoration: InputDecoration(
            hintText: hint,
            prefixIcon: prefixIcon != null ? Icon(prefixIcon, size: 20) : null,
            suffixIcon: suffix,
          ),
        ),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────
// APP SCAFFOLD — Dark background + safe area + optional AppBar
// ─────────────────────────────────────────────────────────────────

class AppScaffold extends StatelessWidget {
  final Widget body;
  final String? title;
  final List<Widget>? actions;
  final Widget? floatingActionButton;
  final Widget? bottomNavigationBar;
  final bool extendBody;

  const AppScaffold({
    super.key,
    required this.body,
    this.title,
    this.actions,
    this.floatingActionButton,
    this.bottomNavigationBar,
    this.extendBody = true,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      extendBody: extendBody,
      appBar: title != null
          ? AppBar(
              title: Text(title!),
              actions: actions,
            )
          : null,
      body: SafeArea(child: body),
      floatingActionButton: floatingActionButton,
      bottomNavigationBar: bottomNavigationBar,
    );
  }
}

// ─────────────────────────────────────────────────────────────────
// STATS CARD — Number + label + icon
// ─────────────────────────────────────────────────────────────────

class StatsCard extends StatelessWidget {
  final String value;
  final String label;
  final IconData icon;
  final Color accentColor;

  const StatsCard({
    super.key,
    required this.value,
    required this.label,
    required this.icon,
    this.accentColor = AppColors.accent,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: AppCard(
        variant: AppCardVariant.glass,
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, size: 20, color: accentColor),
            const SizedBox(height: 12),
            Text(value, style: Theme.of(context).textTheme.headlineMedium?.copyWith(color: AppColors.textPrimary)),
            const SizedBox(height: 4),
            Text(label, style: Theme.of(context).textTheme.labelSmall),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────
// STATUS BADGE — Active/Pending/Error chip
// ─────────────────────────────────────────────────────────────────

class StatusBadge extends StatelessWidget {
  final String label;
  final StatusBadgeTone tone;

  const StatusBadge({super.key, required this.label, this.tone = StatusBadgeTone.neutral});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: _bg.withOpacity(0.15),
        borderRadius: BorderRadius.circular(100),
        border: Border.all(color: _bg.withOpacity(0.3)),
      ),
      child: Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: _fg)),
    );
  }

  Color get _bg {
    switch (tone) {
      case StatusBadgeTone.active: return AppColors.success;
      case StatusBadgeTone.pending: return AppColors.warning;
      case StatusBadgeTone.error: return AppColors.error;
      case StatusBadgeTone.accent: return AppColors.accent;
      case StatusBadgeTone.neutral: return AppColors.textTertiary;
    }
  }

  Color get _fg => tone == StatusBadgeTone.neutral ? AppColors.textPrimary : _bg;
}

enum StatusBadgeTone { active, pending, error, accent, neutral }

// ─────────────────────────────────────────────────────────────────
// SHIMMER LOADER — Skeleton placeholder
// ─────────────────────────────────────────────────────────────────

class ShimmerLoader extends StatelessWidget {
  final ShimmerVariant variant;

  const ShimmerLoader({super.key, this.variant = ShimmerVariant.card});

  @override
  Widget build(BuildContext context) {
    switch (variant) {
      case ShimmerVariant.stats:
        return Row(
          children: List.generate(3, (_) => Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4),
              child: _shimmerBox(height: 88, radius: 20),
            ),
          )),
        );

      case ShimmerVariant.list:
        return Column(
          children: List.generate(5, (_) => Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: _shimmerBox(height: 72, radius: 20),
          )),
        );

      case ShimmerVariant.card:
        return _shimmerBox(height: 120, radius: 20);

      case ShimmerVariant.chart:
        return Column(children: [
          _shimmerBox(height: 24, width: 120),
          const SizedBox(height: 16),
          _shimmerBox(height: 200, radius: 20),
        ]);

      case ShimmerVariant.detail:
        return Column(children: [
          _shimmerBox(height: 160, radius: 20),
          const SizedBox(height: 12),
          Row(children: [
            Expanded(child: _shimmerBox(height: 80, radius: 20)),
            const SizedBox(width: 12),
            Expanded(child: _shimmerBox(height: 80, radius: 20)),
          ]),
          const SizedBox(height: 12),
          _shimmerBox(height: 120, radius: 20),
        ]);
    }
  }

  Widget _shimmerBox({double? height, double? width, double radius = 20}) {
    return Container(
      height: height, width: width,
      decoration: BoxDecoration(
        color: AppColors.surface300.withOpacity(0.5),
        borderRadius: BorderRadius.circular(radius),
      ),
    );
  }
}

enum ShimmerVariant { stats, list, card, chart, detail }

// ─────────────────────────────────────────────────────────────────
// EMPTY STATE — Centered illustration + message + CTA
// ─────────────────────────────────────────────────────────────────

class EmptyState extends StatelessWidget {
  final String title;
  final String? description;
  final String? actionLabel;
  final VoidCallback? onAction;
  final IconData icon;

  const EmptyState({
    super.key,
    required this.title,
    this.description,
    this.actionLabel,
    this.onAction,
    this.icon = Icons.link_off,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 56, color: AppColors.textTertiary),
            const SizedBox(height: 20),
            Text(title, style: Theme.of(context).textTheme.titleLarge, textAlign: TextAlign.center),
            if (description != null) ...[
              const SizedBox(height: 8),
              Text(description!, style: Theme.of(context).textTheme.bodyMedium, textAlign: TextAlign.center),
            ],
            if (actionLabel != null && onAction != null) ...[
              const SizedBox(height: 24),
              AppButton(label: actionLabel!, onPressed: onAction, fullWidth: false),
            ],
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────
// ERROR STATE — Error icon + message + retry
// ─────────────────────────────────────────────────────────────────

class ErrorStateWidget extends StatelessWidget {
  final String message;
  final VoidCallback? onRetry;

  const ErrorStateWidget({super.key, required this.message, this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 48, color: AppColors.error),
            const SizedBox(height: 16),
            Text(message, style: Theme.of(context).textTheme.bodyLarge, textAlign: TextAlign.center),
            if (onRetry != null) ...[
              const SizedBox(height: 20),
              AppButton(label: 'Retry', onPressed: onRetry, variant: AppButtonVariant.secondary, fullWidth: false),
            ],
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────
// SECTION HEADER — Title + optional action link
// ─────────────────────────────────────────────────────────────────

class SectionHeader extends StatelessWidget {
  final String title;
  final String? actionLabel;
  final VoidCallback? onAction;

  const SectionHeader({super.key, required this.title, this.actionLabel, this.onAction});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(title, style: Theme.of(context).textTheme.titleLarge),
          if (actionLabel != null)
            TextButton(
              onPressed: onAction,
              child: Text(actionLabel!, style: const TextStyle(color: AppColors.accent, fontWeight: FontWeight.w600)),
            ),
        ],
      ),
    );
  }
}
