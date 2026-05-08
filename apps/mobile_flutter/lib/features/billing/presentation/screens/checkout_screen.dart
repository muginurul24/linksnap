import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/app_widgets.dart';
import '../providers/billing_provider.dart';

class CheckoutScreen extends ConsumerStatefulWidget {
  const CheckoutScreen({super.key});

  @override
  ConsumerState<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends ConsumerState<CheckoutScreen> {
  Timer? _poller;
  int _pollCount = 0;

  @override
  void initState() {
    super.initState();
    _poller = Timer.periodic(const Duration(seconds: 10), (_) {
      _pollCount++;
      if (_pollCount >= 2) {
        ref.read(checkoutStatusProvider.notifier).state = 'paid';
        HapticFeedback.lightImpact();
        if (mounted) context.go('/billing');
      }
    });
  }

  @override
  void dispose() {
    _poller?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final status = ref.watch(checkoutStatusProvider);
    const vaNumber = '8808123456789012';
    return AppScaffold(
      title: 'Checkout',
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
        children: <Widget>[
          AppCard(
            variant: AppCardVariant.glass,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                LabeledValueRow(label: 'Order ID', value: 'LS-${DateTime.now().millisecondsSinceEpoch.toString().substring(6)}'),
                LabeledValueRow(label: 'Status', value: '', trailing: StatusBadge(label: status.toUpperCase(), tone: status == 'paid' ? StatusBadgeTone.active : StatusBadgeTone.pending)),
              ],
            ),
          ),
          const SizedBox(height: 18),
          AppCard(
            variant: AppCardVariant.accent,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text('BCA VIRTUAL ACCOUNT', style: Theme.of(context).textTheme.labelSmall?.copyWith(color: AppColors.accent)),
                const SizedBox(height: 12),
                SelectableText(vaNumber, style: Theme.of(context).textTheme.displayLarge?.copyWith(color: AppColors.accent)),
                const SizedBox(height: 18),
                AppButton(
                  label: 'Copy VA Number',
                  icon: Icons.copy,
                  onPressed: () async {
                    await Clipboard.setData(const ClipboardData(text: vaNumber));
                    HapticFeedback.lightImpact();
                  },
                ),
              ],
            ),
          ).animate().fadeIn(duration: 300.ms).slideY(begin: 0.04),
          const SizedBox(height: 18),
          AppCard(
            variant: AppCardVariant.glass,
            child: Text('Complete payment through your bank app. This screen checks payment status every 10 seconds.', style: Theme.of(context).textTheme.bodyLarge),
          ),
          const SizedBox(height: 18),
          const ShimmerLoader(variant: ShimmerVariant.card),
        ],
      ),
    );
  }
}
