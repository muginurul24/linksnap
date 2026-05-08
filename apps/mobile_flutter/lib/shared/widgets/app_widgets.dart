import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:shimmer/shimmer.dart';

import '../../core/config/app_config.dart';
import '../../core/theme/app_colors.dart';

class AppButton extends StatelessWidget {
  const AppButton({
    super.key,
    required this.label,
    this.onPressed,
    this.variant = AppButtonVariant.primary,
    this.icon,
    this.loading = false,
    this.fullWidth = true,
    this.semanticLabel,
  });

  final String label;
  final VoidCallback? onPressed;
  final AppButtonVariant variant;
  final IconData? icon;
  final bool loading;
  final bool fullWidth;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    final radius = BorderRadius.circular(14);
    final foreground = _foregroundColor;
    final child = loading
        ? SizedBox(
            height: 22,
            width: 22,
            child: CircularProgressIndicator(
              strokeWidth: 2.5,
              color: foreground,
            ),
          )
        : Row(
            mainAxisSize: fullWidth ? MainAxisSize.max : MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: <Widget>[
              if (icon != null) ...<Widget>[
                Icon(icon, size: 20, color: foreground),
                const SizedBox(width: 8),
              ],
              Flexible(
                child: Text(
                  label,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: foreground,
                    fontWeight: FontWeight.w600,
                    fontSize: 16,
                  ),
                ),
              ),
            ],
          );

    final enabled = onPressed != null && !loading;
    return Semantics(
      button: true,
      label: semanticLabel ?? label,
      enabled: enabled,
      child: SizedBox(
        width: fullWidth ? double.infinity : null,
        height: variant == AppButtonVariant.ghost ? 48 : 56,
        child: _ButtonSurface(
          variant: variant,
          radius: radius,
          enabled: enabled,
          onTap: () {
            HapticFeedback.lightImpact();
            onPressed?.call();
          },
          child: Center(child: child),
        ),
      ),
    );
  }

  Color get _foregroundColor {
    switch (variant) {
      case AppButtonVariant.primary:
      case AppButtonVariant.danger:
        return AppColors.textInverse;
      case AppButtonVariant.secondary:
        return AppColors.textPrimary;
      case AppButtonVariant.ghost:
        return AppColors.accent;
    }
  }
}

class _ButtonSurface extends StatelessWidget {
  const _ButtonSurface({
    required this.variant,
    required this.radius,
    required this.enabled,
    required this.onTap,
    required this.child,
  });

  final AppButtonVariant variant;
  final BorderRadius radius;
  final bool enabled;
  final VoidCallback onTap;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final decoration = switch (variant) {
      AppButtonVariant.primary => const BoxDecoration(gradient: accentGradient),
      AppButtonVariant.danger => const BoxDecoration(color: AppColors.error),
      AppButtonVariant.secondary => BoxDecoration(
          color: Colors.transparent,
          border: Border.all(color: AppColors.surfaceBorder),
        ),
      AppButtonVariant.ghost => const BoxDecoration(color: Colors.transparent),
    };

    return DecoratedBox(
      decoration: decoration.copyWith(borderRadius: radius),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: radius,
          onTap: enabled ? onTap : null,
          child: child,
        ),
      ),
    );
  }
}

enum AppButtonVariant { primary, secondary, ghost, danger }

class HapticIconButton extends StatelessWidget {
  const HapticIconButton({
    super.key,
    required this.icon,
    required this.onPressed,
    required this.label,
    this.color = AppColors.textSecondary,
  });

  final IconData icon;
  final VoidCallback? onPressed;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: label,
      enabled: onPressed != null,
      child: IconButton(
        constraints: const BoxConstraints(minHeight: 48, minWidth: 48),
        icon: Icon(icon, color: color),
        tooltip: label,
        onPressed: onPressed == null
            ? null
            : () {
                HapticFeedback.lightImpact();
                onPressed?.call();
              },
      ),
    );
  }
}

class AppCard extends StatelessWidget {
  const AppCard({
    super.key,
    required this.child,
    this.variant = AppCardVariant.glass,
    this.onTap,
    this.padding,
    this.borderRadius,
    this.semanticLabel,
  });

  final Widget child;
  final AppCardVariant variant;
  final VoidCallback? onTap;
  final EdgeInsetsGeometry? padding;
  final BorderRadiusGeometry? borderRadius;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    final radius = borderRadius ?? BorderRadius.circular(20);
    final pad = padding ?? const EdgeInsets.all(20);
    final card = _buildCard(radius, pad);

    if (onTap == null) {
      return card;
    }

    return Semantics(
      button: true,
      label: semanticLabel,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: radius.resolve(Directionality.of(context)),
          onTap: () {
            HapticFeedback.lightImpact();
            onTap?.call();
          },
          child: card,
        ),
      ),
    );
  }

  Widget _buildCard(BorderRadiusGeometry radius, EdgeInsetsGeometry pad) {
    final decoration = switch (variant) {
      AppCardVariant.glass => BoxDecoration(
          color: AppColors.glassMedium,
          border: Border.all(color: AppColors.surfaceBorder.withOpacity(0.5)),
          borderRadius: radius,
        ),
      AppCardVariant.elevated => BoxDecoration(
          color: AppColors.surface100,
          border: Border.all(color: AppColors.surfaceBorder),
          borderRadius: radius,
        ),
      AppCardVariant.accent => BoxDecoration(
          color: AppColors.accent.withOpacity(0.08),
          border: Border.all(color: AppColors.accent.withOpacity(0.2)),
          borderRadius: radius,
        ),
      AppCardVariant.error => BoxDecoration(
          color: AppColors.error.withOpacity(0.08),
          border: Border.all(color: AppColors.error.withOpacity(0.2)),
          borderRadius: radius,
        ),
    };

    final content = Container(
      decoration: decoration,
      padding: pad,
      child: child,
    );

    if (variant != AppCardVariant.glass) {
      return content;
    }

    return ClipRRect(
      borderRadius: radius,
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
        child: content,
      ),
    );
  }
}

enum AppCardVariant { glass, elevated, accent, error }

class AppInput extends StatelessWidget {
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
    this.maxLines = 1,
    this.textInputAction,
  });

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
  final int maxLines;
  final TextInputAction? textInputAction;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        if (label != null) ...<Widget>[
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
          maxLines: obscure ? 1 : maxLines,
          textInputAction: textInputAction,
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

class AppScaffold extends StatelessWidget {
  const AppScaffold({
    super.key,
    required this.body,
    this.title,
    this.actions,
    this.floatingActionButton,
    this.bottomNavigationBar,
    this.extendBody = true,
    this.leading,
  });

  final Widget body;
  final String? title;
  final List<Widget>? actions;
  final Widget? floatingActionButton;
  final Widget? bottomNavigationBar;
  final bool extendBody;
  final Widget? leading;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      extendBody: extendBody,
      appBar: title == null
          ? null
          : GlassAppBar(
              title: title!,
              actions: actions,
              leading: leading,
            ),
      body: SafeArea(child: body),
      floatingActionButton: floatingActionButton,
      bottomNavigationBar: bottomNavigationBar,
    );
  }
}

class GlassAppBar extends StatelessWidget implements PreferredSizeWidget {
  const GlassAppBar({
    super.key,
    required this.title,
    this.actions,
    this.leading,
  });

  final String title;
  final List<Widget>? actions;
  final Widget? leading;

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 14, sigmaY: 14),
        child: AppBar(
          title: Text(title),
          leading: leading,
          actions: actions,
          backgroundColor: AppColors.surface.withOpacity(0.74),
          surfaceTintColor: Colors.transparent,
        ),
      ),
    );
  }
}

class AppBottomNav extends StatelessWidget {
  const AppBottomNav({
    super.key,
    required this.currentIndex,
    required this.onSelect,
  });

  final int currentIndex;
  final ValueChanged<int> onSelect;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(28),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
            child: Container(
              height: 74,
              decoration: BoxDecoration(
                color: AppColors.glassHeavy,
                border: Border.all(color: AppColors.surfaceBorder.withOpacity(0.75)),
                borderRadius: BorderRadius.circular(28),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: <Widget>[
                  _NavItem(index: 0, currentIndex: currentIndex, icon: Icons.dashboard_outlined, label: 'Home', onSelect: onSelect),
                  _NavItem(index: 1, currentIndex: currentIndex, icon: Icons.link, label: 'Links', onSelect: onSelect),
                  _CenterFab(currentIndex: currentIndex, onSelect: onSelect),
                  _NavItem(index: 3, currentIndex: currentIndex, icon: Icons.flag_outlined, label: 'Campaigns', onSelect: onSelect),
                  _NavItem(index: 4, currentIndex: currentIndex, icon: Icons.settings_outlined, label: 'Settings', onSelect: onSelect),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  const _NavItem({
    required this.index,
    required this.currentIndex,
    required this.icon,
    required this.label,
    required this.onSelect,
  });

  final int index;
  final int currentIndex;
  final IconData icon;
  final String label;
  final ValueChanged<int> onSelect;

  @override
  Widget build(BuildContext context) {
    final selected = index == currentIndex;
    return Semantics(
      button: true,
      selected: selected,
      label: label,
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: () {
          HapticFeedback.lightImpact();
          onSelect(index);
        },
        child: SizedBox(
          width: 58,
          height: 58,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: <Widget>[
              Icon(icon, size: 22, color: selected ? AppColors.accent : AppColors.textTertiary),
              const SizedBox(height: 4),
              Text(
                label,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: selected ? AppColors.accent : AppColors.textTertiary,
                  fontSize: 10,
                  fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CenterFab extends StatelessWidget {
  const _CenterFab({required this.currentIndex, required this.onSelect});

  final int currentIndex;
  final ValueChanged<int> onSelect;

  @override
  Widget build(BuildContext context) {
    final selected = currentIndex == 2;
    return Transform.translate(
      offset: const Offset(0, -18),
      child: Semantics(
        button: true,
        selected: selected,
        label: 'Create link',
        child: GestureDetector(
          onTap: () {
            HapticFeedback.lightImpact();
            onSelect(2);
          },
          child: Container(
            width: 58,
            height: 58,
            decoration: BoxDecoration(
              gradient: accentGradient,
              shape: BoxShape.circle,
              boxShadow: <BoxShadow>[
                BoxShadow(
                  color: AppColors.accent.withOpacity(0.35),
                  blurRadius: 24,
                  offset: const Offset(0, 10),
                ),
              ],
            ),
            child: const Icon(Icons.add, color: AppColors.textInverse, size: 30),
          ),
        ),
      ),
    );
  }
}

class StatsCard extends StatelessWidget {
  const StatsCard({
    super.key,
    required this.value,
    required this.label,
    required this.icon,
    this.accentColor = AppColors.accent,
  });

  final String value;
  final String label;
  final IconData icon;
  final Color accentColor;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      variant: AppCardVariant.glass,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Icon(icon, size: 20, color: accentColor),
          const SizedBox(height: 12),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              value,
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(color: AppColors.textPrimary),
            ).animate().scale(duration: 400.ms, curve: Curves.easeOutBack),
          ),
          const SizedBox(height: 4),
          Text(label, style: Theme.of(context).textTheme.labelSmall, maxLines: 1, overflow: TextOverflow.ellipsis),
        ],
      ),
    );
  }
}

class StatusBadge extends StatelessWidget {
  const StatusBadge({super.key, required this.label, this.tone = StatusBadgeTone.neutral});

  final String label;
  final StatusBadgeTone tone;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: _color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(100),
        border: Border.all(color: _color.withOpacity(0.3)),
      ),
      child: Text(
        label,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: _foreground),
      ),
    );
  }

  Color get _color => switch (tone) {
        StatusBadgeTone.active => AppColors.success,
        StatusBadgeTone.pending => AppColors.warning,
        StatusBadgeTone.error => AppColors.error,
        StatusBadgeTone.accent => AppColors.accent,
        StatusBadgeTone.info => AppColors.info,
        StatusBadgeTone.neutral => AppColors.textTertiary,
      };

  Color get _foreground => tone == StatusBadgeTone.neutral ? AppColors.textPrimary : _color;
}

enum StatusBadgeTone { active, pending, error, accent, info, neutral }

class ShimmerLoader extends StatelessWidget {
  const ShimmerLoader({super.key, this.variant = ShimmerVariant.card});

  final ShimmerVariant variant;

  @override
  Widget build(BuildContext context) {
    final content = switch (variant) {
      ShimmerVariant.dashboard => Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            _box(height: 72),
            const SizedBox(height: 20),
            Row(children: <Widget>[
              Expanded(child: _box(height: 112)),
              const SizedBox(width: 12),
              Expanded(child: _box(height: 112)),
              const SizedBox(width: 12),
              Expanded(child: _box(height: 112)),
            ]),
            const SizedBox(height: 20),
            _box(height: 140),
            const SizedBox(height: 12),
            _box(height: 86),
          ],
        ),
      ShimmerVariant.stats => Row(
          children: List<Widget>.generate(
            3,
            (index) => Expanded(
              child: Padding(
                padding: EdgeInsets.only(right: index == 2 ? 0 : 12),
                child: _box(height: 112),
              ),
            ),
          ),
        ),
      ShimmerVariant.list => Column(
          children: List<Widget>.generate(
            5,
            (index) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: _box(height: 78),
            ),
          ),
        ),
      ShimmerVariant.card => _box(height: 120),
      ShimmerVariant.chart => Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            _box(height: 28, width: 132),
            const SizedBox(height: 16),
            _box(height: 220),
            const SizedBox(height: 16),
            Row(children: <Widget>[
              Expanded(child: _box(height: 100)),
              const SizedBox(width: 12),
              Expanded(child: _box(height: 100)),
            ]),
          ],
        ),
      ShimmerVariant.detail => Column(
          children: <Widget>[
            _box(height: 170),
            const SizedBox(height: 12),
            Row(children: <Widget>[
              Expanded(child: _box(height: 92)),
              const SizedBox(width: 12),
              Expanded(child: _box(height: 92)),
              const SizedBox(width: 12),
              Expanded(child: _box(height: 92)),
            ]),
            const SizedBox(height: 12),
            _box(height: 132),
          ],
        ),
      ShimmerVariant.billing => Column(
          children: <Widget>[
            _box(height: 134),
            const SizedBox(height: 16),
            _box(height: 54),
            const SizedBox(height: 16),
            _box(height: 210),
            const SizedBox(height: 12),
            _box(height: 180),
          ],
        ),
    };

    return Shimmer.fromColors(
      baseColor: AppColors.surface200,
      highlightColor: AppColors.surface300,
      child: content,
    );
  }

  Widget _box({double? height, double? width, double radius = 20}) {
    return Container(
      height: height,
      width: width,
      decoration: BoxDecoration(
        color: AppColors.surface300.withOpacity(0.8),
        borderRadius: BorderRadius.circular(radius),
      ),
    );
  }
}

enum ShimmerVariant { dashboard, stats, list, card, chart, detail, billing }

class EmptyState extends StatelessWidget {
  const EmptyState({
    super.key,
    required this.title,
    this.description,
    this.actionLabel,
    this.onAction,
    this.icon = Icons.link_off,
  });

  final String title;
  final String? description;
  final String? actionLabel;
  final VoidCallback? onAction;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            Container(
              width: 92,
              height: 92,
              decoration: BoxDecoration(
                color: AppColors.glassMedium,
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.surfaceBorder),
              ),
              child: Stack(
                alignment: Alignment.center,
                children: <Widget>[
                  ExcludeSemantics(
                    child: SvgPicture.asset(
                      'assets/images/empty_links.svg',
                      width: 72,
                      colorFilter: ColorFilter.mode(AppColors.textTertiary.withOpacity(0.28), BlendMode.srcIn),
                    ),
                  ),
                  Icon(icon, size: 34, color: AppColors.textTertiary),
                ],
              ),
            ),
            const SizedBox(height: 20),
            Text(title, style: Theme.of(context).textTheme.titleLarge, textAlign: TextAlign.center),
            if (description != null) ...<Widget>[
              const SizedBox(height: 8),
              Text(description!, style: Theme.of(context).textTheme.bodyMedium, textAlign: TextAlign.center),
            ],
            if (actionLabel != null && onAction != null) ...<Widget>[
              const SizedBox(height: 24),
              AppButton(label: actionLabel!, onPressed: onAction, fullWidth: false),
            ],
          ],
        ),
      ),
    ).animate().fadeIn(duration: 300.ms);
  }
}

class ErrorStateWidget extends StatelessWidget {
  const ErrorStateWidget({super.key, required this.message, this.onRetry});

  final String message;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            const Icon(Icons.error_outline, size: 48, color: AppColors.error),
            const SizedBox(height: 16),
            Text(message, style: Theme.of(context).textTheme.bodyLarge, textAlign: TextAlign.center),
            if (onRetry != null) ...<Widget>[
              const SizedBox(height: 20),
              AppButton(
                label: 'Retry',
                onPressed: onRetry,
                variant: AppButtonVariant.secondary,
                fullWidth: false,
              ),
            ],
          ],
        ),
      ),
    ).animate().fadeIn(duration: 250.ms).shakeX(duration: 350.ms, amount: 4);
  }
}

class SectionHeader extends StatelessWidget {
  const SectionHeader({
    super.key,
    required this.title,
    this.actionLabel,
    this.onAction,
  });

  final String title;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: <Widget>[
          Text(title, style: Theme.of(context).textTheme.titleLarge),
          if (actionLabel != null)
            TextButton(
              onPressed: onAction == null
                  ? null
                  : () {
                      HapticFeedback.lightImpact();
                      onAction?.call();
                    },
              child: Text(actionLabel!, style: const TextStyle(color: AppColors.accent, fontWeight: FontWeight.w600)),
            ),
        ],
      ),
    );
  }
}

class LinkTile extends StatelessWidget {
  const LinkTile({
    super.key,
    required this.slug,
    required this.destination,
    required this.clicks,
    this.status = 'Active',
    this.onTap,
    this.onCopy,
  });

  final String slug;
  final String destination;
  final int clicks;
  final String status;
  final VoidCallback? onTap;
  final VoidCallback? onCopy;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      variant: AppCardVariant.glass,
      padding: const EdgeInsets.all(16),
      onTap: onTap,
      semanticLabel: slug,
      child: Row(
        children: <Widget>[
          Container(
            width: 46,
            height: 46,
            decoration: BoxDecoration(
              color: AppColors.accent.withOpacity(0.1),
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Icon(Icons.link, color: AppColors.accent, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(AppConfig.shortLinkDisplay(slug), style: Theme.of(context).textTheme.labelLarge, maxLines: 1, overflow: TextOverflow.ellipsis),
                const SizedBox(height: 3),
                Text(destination, style: Theme.of(context).textTheme.bodyMedium, maxLines: 1, overflow: TextOverflow.ellipsis),
              ],
            ),
          ),
          const SizedBox(width: 10),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: <Widget>[
              StatusBadge(label: clicks.toString(), tone: StatusBadgeTone.accent),
              const SizedBox(height: 6),
              Text(status, style: Theme.of(context).textTheme.labelSmall),
            ],
          ),
        ],
      ),
    );
  }
}

class FilterChipButton extends StatelessWidget {
  const FilterChipButton({
    super.key,
    required this.label,
    required this.selected,
    required this.onSelected,
  });

  final String label;
  final bool selected;
  final VoidCallback onSelected;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      selected: selected,
      label: label,
      child: GestureDetector(
        onTap: () {
          HapticFeedback.lightImpact();
          onSelected();
        },
        child: Container(
          constraints: const BoxConstraints(minHeight: 48),
          alignment: Alignment.center,
          margin: const EdgeInsets.only(right: 8),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          decoration: BoxDecoration(
            color: selected ? AppColors.accent : AppColors.surface100,
            borderRadius: BorderRadius.circular(100),
            border: Border.all(color: selected ? AppColors.accent : AppColors.surfaceBorder),
          ),
          child: Text(
            label,
            style: TextStyle(
              color: selected ? AppColors.textInverse : AppColors.textSecondary,
              fontWeight: FontWeight.w600,
              fontSize: 13,
            ),
          ),
        ),
      ),
    );
  }
}

class SegmentedControl extends StatelessWidget {
  const SegmentedControl({
    super.key,
    required this.values,
    required this.selectedIndex,
    required this.onSelected,
  });

  final List<String> values;
  final int selectedIndex;
  final ValueChanged<int> onSelected;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: AppColors.surface100,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.surfaceBorder),
      ),
      child: Row(
        children: values.asMap().entries.map((entry) {
          final active = entry.key == selectedIndex;
          return Expanded(
            child: Semantics(
              button: true,
              selected: active,
              label: entry.value,
              child: GestureDetector(
                onTap: () {
                  HapticFeedback.lightImpact();
                  onSelected(entry.key);
                },
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 180),
                  constraints: const BoxConstraints(minHeight: 48),
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: active ? AppColors.accent : Colors.transparent,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    entry.value,
                    textAlign: TextAlign.center,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: active ? AppColors.textInverse : AppColors.textSecondary,
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

class QuickActionCard extends StatelessWidget {
  const QuickActionCard({
    super.key,
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      variant: AppCardVariant.elevated,
      onTap: onTap,
      padding: const EdgeInsets.all(16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Icon(icon, size: 24, color: AppColors.accent),
          const SizedBox(height: 8),
          Text(label, style: Theme.of(context).textTheme.labelLarge, textAlign: TextAlign.center, maxLines: 1, overflow: TextOverflow.ellipsis),
        ],
      ),
    );
  }
}

class PremiumSwitchTile extends StatelessWidget {
  const PremiumSwitchTile({
    super.key,
    required this.title,
    required this.value,
    required this.onChanged,
    this.subtitle,
  });

  final String title;
  final String? subtitle;
  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      variant: AppCardVariant.elevated,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: <Widget>[
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(title, style: Theme.of(context).textTheme.labelLarge),
                if (subtitle != null) ...<Widget>[
                  const SizedBox(height: 4),
                  Text(subtitle!, style: Theme.of(context).textTheme.bodyMedium),
                ],
              ],
            ),
          ),
          Switch(
            value: value,
            activeColor: AppColors.accent,
            onChanged: (next) {
              HapticFeedback.lightImpact();
              onChanged(next);
            },
          ),
        ],
      ),
    );
  }
}

class LabeledValueRow extends StatelessWidget {
  const LabeledValueRow({
    super.key,
    required this.label,
    required this.value,
    this.trailing,
  });

  final String label;
  final String value;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: <Widget>[
          Expanded(child: Text(label, style: Theme.of(context).textTheme.bodyMedium)),
          const SizedBox(width: 12),
          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: Theme.of(context).textTheme.labelLarge,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          if (trailing != null) ...<Widget>[
            const SizedBox(width: 8),
            trailing!,
          ],
        ],
      ),
    );
  }
}

class QrDisplay extends StatelessWidget {
  const QrDisplay({super.key, required this.data});

  final String data;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.textPrimary,
        borderRadius: BorderRadius.circular(20),
      ),
      child: QrImageView(
        data: data,
        version: QrVersions.auto,
        size: 220,
        backgroundColor: AppColors.textPrimary,
        foregroundColor: AppColors.textInverse,
      ),
    );
  }
}
