import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/app_widgets.dart';
import '../providers/billing_provider.dart';

class PlansScreen extends ConsumerStatefulWidget {
  const PlansScreen({super.key});

  @override
  ConsumerState<PlansScreen> createState() => _PlansScreenState();
}

class _PlansScreenState extends ConsumerState<PlansScreen> {
  bool _yearly = false;

  @override
  Widget build(BuildContext context) {
    final billingAsync = ref.watch(billingProvider);
    return AppScaffold(
      title: 'Billing',
      actions: <Widget>[
        HapticIconButton(icon: Icons.receipt_long, label: 'Billing history', onPressed: () => context.push('/billing/history')),
      ],
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
        children: <Widget>[
          billingAsync.when(
            loading: () => const ShimmerLoader(variant: ShimmerVariant.billing),
            error: (error, _) => ErrorStateWidget(message: error.toString(), onRetry: () => ref.invalidate(billingProvider)),
            data: (billing) {
              if (billing.plans.isEmpty) {
                return const EmptyState(title: 'No plans available', description: 'Billing plans will appear here.', icon: Icons.workspace_premium);
              }
              return Column(
                children: <Widget>[
                  AppCard(
                    variant: AppCardVariant.accent,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Text(billing.currentPlan, style: Theme.of(context).textTheme.headlineLarge?.copyWith(color: AppColors.accent)),
                        const SizedBox(height: 4),
                        const StatusBadge(label: 'Active', tone: StatusBadgeTone.active),
                        const SizedBox(height: 8),
                        Text('Next billing: ${DateFormat('MMMM d, y').format(billing.nextBilling)}', style: Theme.of(context).textTheme.bodyMedium),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  SegmentedControl(values: const <String>['Monthly', 'Yearly -20%'], selectedIndex: _yearly ? 1 : 0, onSelected: (index) => setState(() => _yearly = index == 1)),
                  const SizedBox(height: 24),
                  ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: billing.plans.length,
                    itemBuilder: (context, index) {
                      final plan = billing.plans[index];
                      final price = _yearly ? plan.yearlyPrice : plan.monthlyPrice;
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: AppCard(
                          variant: plan.tag != null ? AppCardVariant.accent : AppCardVariant.glass,
                          onTap: plan.current ? null : () => context.push('/billing/checkout?plan=${plan.name}'),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: <Widget>[
                              Row(
                                children: <Widget>[
                                  Expanded(child: Text(plan.name, style: Theme.of(context).textTheme.headlineMedium)),
                                  if (plan.current) const StatusBadge(label: 'Current Plan', tone: StatusBadgeTone.active) else if (plan.tag != null) StatusBadge(label: plan.tag!, tone: StatusBadgeTone.accent),
                                ],
                              ),
                              const SizedBox(height: 10),
                              Text('\$$price', style: Theme.of(context).textTheme.displayLarge?.copyWith(color: AppColors.accent)),
                              Text(_yearly ? '/year' : '/mo', style: Theme.of(context).textTheme.labelSmall),
                              const SizedBox(height: 16),
                              ListView.builder(
                                shrinkWrap: true,
                                physics: const NeverScrollableScrollPhysics(),
                                itemCount: plan.features.length,
                                itemBuilder: (context, featureIndex) => Padding(
                                  padding: const EdgeInsets.only(bottom: 8),
                                  child: Row(
                                    children: <Widget>[
                                      const Icon(Icons.check_circle, color: AppColors.success, size: 18),
                                      const SizedBox(width: 10),
                                      Expanded(child: Text(plan.features[featureIndex], style: Theme.of(context).textTheme.bodyMedium)),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ).animate().fadeIn(duration: 300.ms, delay: (50 * index).ms).slideY(begin: 0.05),
                      );
                    },
                  ),
                  const SizedBox(height: 10),
                  SectionHeader(title: 'Billing History', actionLabel: 'View All', onAction: () => context.push('/billing/history')),
                  ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: billing.history.length,
                    itemBuilder: (context, index) {
                      final tx = billing.history[index];
                      return LabeledValueRow(
                        label: DateFormat('MMM d, y').format(tx.date),
                        value: '\$${tx.amount}',
                        trailing: StatusBadge(label: tx.status, tone: StatusBadgeTone.active),
                      );
                    },
                  ),
                  const SizedBox(height: 18),
                  AppButton(label: 'Cancel Subscription', variant: AppButtonVariant.ghost, onPressed: _confirmCancel),
                ],
              ).animate().fadeIn(duration: 300.ms);
            },
          ),
        ],
      ),
    );
  }

  Future<void> _confirmCancel() async {
    await showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.surface100,
        title: const Text('Cancel subscription'),
        content: const Text('Your Pro features remain active until the end of the billing period.'),
        actions: <Widget>[
          TextButton(
            onPressed: () {
              HapticFeedback.lightImpact();
              Navigator.pop(context);
            },
            child: const Text('Keep Plan'),
          ),
          TextButton(
            onPressed: () {
              HapticFeedback.lightImpact();
              Navigator.pop(context);
            },
            child: const Text('Cancel', style: TextStyle(color: AppColors.error)),
          ),
        ],
      ),
    );
  }
}
