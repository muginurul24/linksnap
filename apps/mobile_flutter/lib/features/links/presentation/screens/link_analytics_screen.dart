import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../shared/models/app_models.dart';
import '../../../../shared/widgets/app_widgets.dart';
import '../providers/analytics_provider.dart';

class LinkAnalyticsScreen extends ConsumerWidget {
  const LinkAnalyticsScreen({super.key, required this.id});

  final String id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final analyticsAsync = ref.watch(linkAnalyticsProvider(id));
    final range = ref.watch(analyticsRangeProvider);
    return AppScaffold(
      title: 'Analytics',
      actions: <Widget>[
        HapticIconButton(
          icon: Icons.download,
          label: 'Export CSV',
          onPressed: () {
            HapticFeedback.lightImpact();
            Share.share('date,clicks\nMon,320\nTue,440\nWed,390');
          },
        ),
      ],
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
        children: <Widget>[
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: <Widget>[
                for (final chip in <String>['7D', '30D', '90D', 'All Time'])
                  FilterChipButton(
                    label: chip,
                    selected: range == chip,
                    onSelected: () => ref.read(analyticsRangeProvider.notifier).state = chip,
                  ),
              ],
            ),
          ),
          const SizedBox(height: 22),
          analyticsAsync.when(
            loading: () => const ShimmerLoader(variant: ShimmerVariant.chart),
            error: (error, _) => ErrorStateWidget(message: error.toString(), onRetry: () => ref.invalidate(linkAnalyticsProvider(id))),
            data: (data) {
              if (data.total == 0) {
                return const EmptyState(title: 'No clicks yet', description: 'Share your link to get started.', icon: Icons.analytics_outlined);
              }
              return Column(
                children: <Widget>[
                  AppCard(
                    variant: AppCardVariant.glass,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Text('Clicks', style: Theme.of(context).textTheme.titleLarge),
                        const SizedBox(height: 24),
                        SizedBox(height: 220, child: _ClicksChart(points: data.clicks)),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  GridView.count(
                    crossAxisCount: 2,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                    childAspectRatio: 1.35,
                    children: <Widget>[
                      StatsCard(value: '${data.total}', label: 'Total', icon: Icons.touch_app),
                      StatsCard(value: '${data.unique}', label: 'Unique', icon: Icons.public, accentColor: AppColors.success),
                      StatsCard(value: '${data.ctr}%', label: 'Avg CTR', icon: Icons.trending_up, accentColor: AppColors.info),
                      StatsCard(value: '${data.bounceRate}%', label: 'Bounce', icon: Icons.trending_down, accentColor: AppColors.error),
                    ],
                  ),
                  const SizedBox(height: 20),
                  _RankedCard(title: 'Top Countries', metrics: data.countries),
                  const SizedBox(height: 16),
                  _DeviceBreakdown(metrics: data.devices),
                  const SizedBox(height: 16),
                  _RankedCard(title: 'Top Referrers', metrics: data.referrers, badges: true),
                ],
              ).animate().fadeIn(duration: 300.ms);
            },
          ),
        ],
      ),
    );
  }
}

class _ClicksChart extends StatelessWidget {
  const _ClicksChart({required this.points});

  final List<AnalyticsPoint> points;

  @override
  Widget build(BuildContext context) {
    return LineChart(
      LineChartData(
        minY: 0,
        gridData: FlGridData(show: true, drawVerticalLine: false, getDrawingHorizontalLine: (_) => FlLine(color: AppColors.surfaceBorder, strokeWidth: 1)),
        titlesData: const FlTitlesData(leftTitles: AxisTitles(), topTitles: AxisTitles(), rightTitles: AxisTitles(), bottomTitles: AxisTitles()),
        borderData: FlBorderData(show: false),
        lineTouchData: LineTouchData(
          touchTooltipData: LineTouchTooltipData(
            getTooltipColor: (_) => AppColors.surface200,
            getTooltipItems: (spots) => spots.map((spot) => LineTooltipItem('${spot.y.toInt()} clicks', const TextStyle(color: AppColors.textPrimary))).toList(),
          ),
        ),
        lineBarsData: <LineChartBarData>[
          LineChartBarData(
            spots: points.asMap().entries.map((entry) => FlSpot(entry.key.toDouble(), entry.value.value)).toList(),
            isCurved: true,
            color: AppColors.accent,
            barWidth: 3,
            dotData: const FlDotData(show: false),
            belowBarData: BarAreaData(
              show: true,
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: <Color>[AppColors.accent.withOpacity(0.32), Colors.transparent],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _RankedCard extends StatelessWidget {
  const _RankedCard({required this.title, required this.metrics, this.badges = false});

  final String title;
  final List<RankedMetric> metrics;
  final bool badges;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      variant: AppCardVariant.glass,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(title, style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 16),
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: metrics.length,
            itemBuilder: (context, index) {
              final metric = metrics[index];
              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Column(
                  children: <Widget>[
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: <Widget>[
                        Expanded(child: Text(metric.label, style: Theme.of(context).textTheme.bodyLarge, overflow: TextOverflow.ellipsis)),
                        badges ? StatusBadge(label: '${metric.count}', tone: StatusBadgeTone.accent) : Text('${metric.count}', style: const TextStyle(color: AppColors.accent, fontWeight: FontWeight.w600)),
                      ],
                    ),
                    const SizedBox(height: 6),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(value: metric.percent, backgroundColor: AppColors.surface300, color: AppColors.accent, minHeight: 6),
                    ),
                  ],
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}

class _DeviceBreakdown extends StatelessWidget {
  const _DeviceBreakdown({required this.metrics});

  final List<RankedMetric> metrics;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      variant: AppCardVariant.glass,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text('Device Breakdown', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 16),
          Row(
            children: metrics.map((metric) {
              return Expanded(
                child: Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: AppCard(
                    variant: AppCardVariant.elevated,
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      children: <Widget>[
                        const Icon(Icons.devices, color: AppColors.textSecondary),
                        const SizedBox(height: 8),
                        Text('${metric.count}%', style: Theme.of(context).textTheme.headlineMedium?.copyWith(color: AppColors.accent)),
                        Text(metric.label, style: Theme.of(context).textTheme.labelSmall),
                      ],
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }
}
