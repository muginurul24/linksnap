import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../../shared/widgets/app_widgets.dart';
import '../providers/billing_provider.dart';

class BillingHistoryScreen extends ConsumerWidget {
  const BillingHistoryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final billingAsync = ref.watch(billingProvider);
    return AppScaffold(
      title: 'Billing History',
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
        children: <Widget>[
          billingAsync.when(
            loading: () => const ShimmerLoader(variant: ShimmerVariant.list),
            error: (error, _) => ErrorStateWidget(message: error.toString(), onRetry: () => ref.invalidate(billingProvider)),
            data: (billing) {
              if (billing.history.isEmpty) {
                return const EmptyState(title: 'No billing history', description: 'Transactions appear after your first payment.', icon: Icons.receipt_long);
              }
              return ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: billing.history.length,
                itemBuilder: (context, index) {
                  final tx = billing.history[index];
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: AppCard(
                      variant: AppCardVariant.glass,
                      child: LabeledValueRow(
                        label: '${tx.id} - ${DateFormat('MMM d, y').format(tx.date)}',
                        value: '\$${tx.amount}',
                        trailing: StatusBadge(label: tx.status, tone: StatusBadgeTone.active),
                      ),
                    ).animate().fadeIn(duration: 300.ms, delay: (50 * index).ms).slideY(begin: 0.05),
                  );
                },
              );
            },
          ),
        ],
      ),
    );
  }
}
