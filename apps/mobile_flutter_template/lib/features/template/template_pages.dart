import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/theme/app_colors.dart';
import '../../shared/widgets/app_widgets.dart';

/// ═══════════════════════════════════════════════════════════════
/// TEMPLATE: Dashboard Screen (GoPay Merch Premium style)
/// Reference for Codex — ALL dashboard-like screens follow this.
/// ═══════════════════════════════════════════════════════════════
class DashboardTemplate extends StatelessWidget {
  const DashboardTemplate({super.key});

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      body: RefreshIndicator(
        color: AppColors.accent,
        onRefresh: () async => await Future.delayed(const Duration(seconds: 1)),
        child: ListView(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          children: [
            const SizedBox(height: 12),

            // ── HEADER: Greeting + Avatar ──
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Good morning, Rafi 👋',
                          style: Theme.of(context).textTheme.headlineLarge),
                      const SizedBox(height: 4),
                      Text('Friday, May 8, 2026',
                          style: Theme.of(context).textTheme.bodyMedium),
                    ],
                  ),
                ),
                GestureDetector(
                  onTap: () {},
                  child: Container(
                    width: 56, height: 56,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: AppColors.accent.withOpacity(0.5), width: 2),
                    ),
                    child: const CircleAvatar(
                      radius: 26,
                      backgroundColor: AppColors.accent,
                      child: Text('R', style: TextStyle(
                          color: AppColors.textInverse, fontWeight: FontWeight.w700, fontSize: 20)),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // ── STATS ROW: 3 cards ──
            Row(
              children: [
                const StatsCard(value: '234', label: 'Links', icon: Icons.link, accentColor: AppColors.accent),
                const SizedBox(width: 12),
                const StatsCard(value: '8.9K', label: 'Clicks Today', icon: Icons.touch_app, accentColor: AppColors.success),
                const SizedBox(width: 12),
                const StatsCard(value: '5', label: 'Campaigns', icon: Icons.flag, accentColor: AppColors.info),
              ],
            ),
            const SizedBox(height: 24),

            // ── QUICK ACTIONS: 2×2 grid ──
            Row(
              children: [
                Expanded(child: AppCard(
                  variant: AppCardVariant.elevated,
                  onTap: () {},
                  padding: const EdgeInsets.all(16),
                  child: Column(children: [
                    const Icon(Icons.add_circle_outline, size: 24, color: AppColors.accent),
                    const SizedBox(height: 8),
                    Text('Create Link', style: Theme.of(context).textTheme.labelLarge),
                  ]),
                )),
                const SizedBox(width: 12),
                Expanded(child: AppCard(
                  variant: AppCardVariant.elevated,
                  onTap: () {},
                  padding: const EdgeInsets.all(16),
                  child: Column(children: [
                    const Icon(Icons.qr_code_scanner, size: 24, color: AppColors.accent),
                    const SizedBox(height: 8),
                    Text('Scan QR', style: Theme.of(context).textTheme.labelLarge),
                  ]),
                )),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: AppCard(
                  variant: AppCardVariant.elevated,
                  onTap: () {},
                  padding: const EdgeInsets.all(16),
                  child: Column(children: [
                    const Icon(Icons.link, size: 24, color: AppColors.accent),
                    const SizedBox(height: 8),
                    Text('My Links', style: Theme.of(context).textTheme.labelLarge),
                  ]),
                )),
                const SizedBox(width: 12),
                Expanded(child: AppCard(
                  variant: AppCardVariant.elevated,
                  onTap: () {},
                  padding: const EdgeInsets.all(16),
                  child: Column(children: [
                    const Icon(Icons.flag, size: 24, color: AppColors.accent),
                    const SizedBox(height: 8),
                    Text('Campaigns', style: Theme.of(context).textTheme.labelLarge),
                  ]),
                )),
              ],
            ),
            const SizedBox(height: 24),

            // ── UPGRADE BANNER (when FREE plan) ──
            AppCard(
              variant: AppCardVariant.accent,
              onTap: () {},
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Upgrade to Pro', style: Theme.of(context).textTheme.headlineMedium?.copyWith(color: AppColors.accent)),
                  const SizedBox(height: 8),
                  Text('Unlock higher limits, advanced analytics, API access, and premium Link Pages.',
                      style: Theme.of(context).textTheme.bodyMedium),
                  const SizedBox(height: 16),
                  AppButton(label: 'View Plans', onPressed: () {}, fullWidth: false),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // ── RECENT LINKS ──
            SectionHeader(title: 'Recent Links', actionLabel: 'View All', onAction: () {}),
            ...List.generate(3, (i) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: AppCard(
                variant: AppCardVariant.glass,
                padding: const EdgeInsets.all(16),
                onTap: () {},
                child: Row(
                  children: [
                    Container(
                      width: 44, height: 44,
                      decoration: BoxDecoration(
                        color: AppColors.accent.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(Icons.link, color: AppColors.accent, size: 22),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('linksnap.id/promo${i + 1}', style: Theme.of(context).textTheme.labelLarge),
                          const SizedBox(height: 2),
                          Text('https://example.com/very-long-url-that-gets-truncated-${i + 1}',
                              style: Theme.of(context).textTheme.bodyMedium, maxLines: 1, overflow: TextOverflow.ellipsis),
                        ],
                      ),
                    ),
                    const StatusBadge(label: '2.3K', tone: StatusBadgeTone.accent),
                  ],
                ),
              ),
            )),
            const SizedBox(height: 100),
          ],
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// TEMPLATE: Login Screen
// ═══════════════════════════════════════════════════════════════
class LoginTemplate extends StatefulWidget {
  const LoginTemplate({super.key});

  @override
  State<LoginTemplate> createState() => _LoginTemplateState();
}

class _LoginTemplateState extends State<LoginTemplate> {
  bool _loading = false;
  String? _error;

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // ── LOGO ──
              ShaderMask(
                shaderCallback: (bounds) => const LinearGradient(
                  colors: [AppColors.accent300, AppColors.accent600],
                ).createShader(bounds),
                child: Text('LinkSnap', style: Theme.of(context).textTheme.displayLarge?.copyWith(color: Colors.white)),
              ),
              const SizedBox(height: 4),
              Text('Smart links for serious growth teams.', style: Theme.of(context).textTheme.bodyMedium),
              const SizedBox(height: 40),

              // ── LOGIN CARD ──
              AppCard(
                variant: AppCardVariant.glass,
                padding: const EdgeInsets.all(24),
                child: Column(
                  children: [
                    const AppInput(label: 'Email', hint: 'you@company.com', prefixIcon: Icons.mail_outline, keyboardType: TextInputType.emailAddress),
                    const SizedBox(height: 20),
                    const AppInput(label: 'Password', hint: 'Enter password', prefixIcon: Icons.lock_outline, obscure: true),
                    const SizedBox(height: 8),
                    Align(
                      alignment: Alignment.centerRight,
                      child: TextButton(
                        onPressed: () {},
                        child: const Text('Forgot password?', style: TextStyle(color: AppColors.accent, fontWeight: FontWeight.w600, fontSize: 13)),
                      ),
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: 8),
                      Text(_error!, style: const TextStyle(color: AppColors.error, fontSize: 14)),
                    ],
                    const SizedBox(height: 16),
                    AppButton(
                      label: 'Sign In',
                      loading: _loading,
                      onPressed: () {
                        setState(() {
                          _loading = true; _error = null;
                        });
                        HapticFeedback.lightImpact();
                        Future.delayed(const Duration(seconds: 1), () {
                          if (mounted) setState(() => _loading = false);
                        });
                      },
                    ),
                    const SizedBox(height: 24),
                    Row(
                      children: [
                        const Expanded(child: Divider()),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          child: Text('or continue with', style: Theme.of(context).textTheme.labelSmall),
                        ),
                        const Expanded(child: Divider()),
                      ],
                    ),
                    const SizedBox(height: 20),
                    AppButton(label: 'Google', onPressed: () {}, variant: AppButtonVariant.secondary),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              AppButton(
                label: 'Create an account',
                variant: AppButtonVariant.ghost,
                onPressed: () {},
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// TEMPLATE: Link Detail Screen
// ═══════════════════════════════════════════════════════════════
class LinkDetailTemplate extends StatelessWidget {
  const LinkDetailTemplate({super.key});

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      title: 'Link Details',
      actions: [
        IconButton(icon: const Icon(Icons.edit_outlined, color: AppColors.textSecondary), onPressed: () {}),
      ],
      body: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 20),
        children: [
          const SizedBox(height: 8),

          // ── URL CARD ──
          AppCard(
            variant: AppCardVariant.glass,
            padding: const EdgeInsets.symmetric(vertical: 32, horizontal: 20),
            child: Column(
              children: [
                Text('linksnap.id/summer-sale', style: Theme.of(context).textTheme.headlineLarge, textAlign: TextAlign.center),
                const SizedBox(height: 20),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    AppButton(label: 'Copy', icon: Icons.copy, onPressed: () {
                      HapticFeedback.lightImpact();
                    }, variant: AppButtonVariant.secondary, fullWidth: false),
                    const SizedBox(width: 12),
                    AppButton(label: 'Share', icon: Icons.share, onPressed: () {}, fullWidth: false),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // ── STATS ──
          Row(
            children: [
              const StatsCard(value: '12.4K', label: 'Total Clicks', icon: Icons.touch_app),
              const SizedBox(width: 12),
              const StatsCard(value: '842', label: 'Today', icon: Icons.trending_up, accentColor: AppColors.success),
              const SizedBox(width: 12),
              const StatsCard(value: '3.1K', label: 'Unique', icon: Icons.people, accentColor: AppColors.info),
            ],
          ),
          const SizedBox(height: 16),

          // ── DESTINATION ──
          AppCard(
            variant: AppCardVariant.glass,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Destination', style: Theme.of(context).textTheme.labelSmall),
                const SizedBox(height: 8),
                Text('https://example.com/summer-sale-2026-landing-page',
                    style: Theme.of(context).textTheme.bodyLarge, maxLines: 2, overflow: TextOverflow.ellipsis),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // ── QUICK ACTIONS ──
          Wrap(
            spacing: 12, runSpacing: 12,
            children: [
              _ActionChip(icon: Icons.qr_code, label: 'QR Code', onTap: () {}),
              _ActionChip(icon: Icons.analytics, label: 'Analytics', onTap: () {}),
              _ActionChip(icon: Icons.open_in_new, label: 'Open', onTap: () {}),
              _ActionChip(icon: Icons.delete_outline, label: 'Delete', onTap: () {}, danger: true),
            ],
          ),
          const SizedBox(height: 16),

          // ── LINK PAGE CARD (if enabled) ──
          AppCard(
            variant: AppCardVariant.accent,
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Link Page Enabled', style: Theme.of(context).textTheme.headlineMedium?.copyWith(color: AppColors.accent)),
                      const SizedBox(height: 4),
                      Text('Preview, CTA, QR, and countdown are active.', style: Theme.of(context).textTheme.bodyMedium),
                    ],
                  ),
                ),
                const StatusBadge(label: 'Live', tone: StatusBadgeTone.active),
              ],
            ),
          ),
          const SizedBox(height: 100),
        ],
      ),
    );
  }
}

class _ActionChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool danger;
  const _ActionChip({required this.icon, required this.label, required this.onTap, this.danger = false});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: (MediaQuery.of(context).size.width - 64) / 2,
      child: AppButton(
        label: label,
        icon: icon,
        variant: danger ? AppButtonVariant.danger : AppButtonVariant.secondary,
        onPressed: onTap,
        fullWidth: true,
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// TEMPLATE: Analytics Screen
// ═══════════════════════════════════════════════════════════════
class AnalyticsTemplate extends StatefulWidget {
  const AnalyticsTemplate({super.key});

  @override
  State<AnalyticsTemplate> createState() => _AnalyticsTemplateState();
}

class _AnalyticsTemplateState extends State<AnalyticsTemplate> {
  String _range = '7D';

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      title: 'Analytics',
      actions: [
        IconButton(icon: const Icon(Icons.download, color: AppColors.textSecondary), onPressed: () {}),
      ],
      body: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 20),
        children: [
          const SizedBox(height: 8),

          // ── DATE RANGE CHIPS ──
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: ['7D', '30D', '90D', 'All'].map((label) {
                final active = _range == label;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: GestureDetector(
                    onTap: () => setState(() => _range = label),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      decoration: BoxDecoration(
                        color: active ? AppColors.accent : AppColors.surface100,
                        borderRadius: BorderRadius.circular(100),
                        border: Border.all(color: active ? AppColors.accent : AppColors.surface300),
                      ),
                      child: Text(label, style: TextStyle(
                        color: active ? AppColors.textInverse : AppColors.textSecondary,
                        fontWeight: FontWeight.w600, fontSize: 13,
                      )),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 24),

          // ── CHART ──
          AppCard(
            variant: AppCardVariant.glass,
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Clicks', style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 24),
                Container(
                  height: 200,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(16),
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [AppColors.accent.withOpacity(0.15), Colors.transparent],
                    ),
                  ),
                  child: Center(
                    child: Text('← Chart goes here →\n(fl_chart LineChart)', textAlign: TextAlign.center,
                        style: TextStyle(color: AppColors.textTertiary.withOpacity(0.5))),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // ── STATS GRID ──
          Row(
            children: [
              const Expanded(child: StatsCard(value: '12.4K', label: 'Total', icon: Icons.touch_app)),
              const SizedBox(width: 12),
              const Expanded(child: StatsCard(value: '3.1K', label: 'Unique', icon: Icons.public, accentColor: AppColors.success)),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              const Expanded(child: StatsCard(value: '4.2%', label: 'Avg CTR', icon: Icons.trending_up, accentColor: AppColors.info)),
              const SizedBox(width: 12),
              const Expanded(child: StatsCard(value: '32%', label: 'Bounce', icon: Icons.trending_down, accentColor: AppColors.error)),
            ],
          ),
          const SizedBox(height: 24),

          // ── TOP COUNTRIES ──
          AppCard(
            variant: AppCardVariant.glass,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Top Countries', style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 16),
                ...[
                  ('🇮🇩 Indonesia', 8234, 1.0),
                  ('🇺🇸 United States', 2100, 0.25),
                  ('🇸🇬 Singapore', 890, 0.11),
                ].map((e) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(e.$1, style: Theme.of(context).textTheme.bodyLarge),
                          Text('${e.$2}', style: const TextStyle(color: AppColors.accent, fontWeight: FontWeight.w600)),
                        ],
                      ),
                      const SizedBox(height: 6),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(4),
                        child: LinearProgressIndicator(
                          value: e.$3,
                          backgroundColor: AppColors.surface300,
                          color: AppColors.accent,
                          minHeight: 6,
                        ),
                      ),
                    ],
                  ),
                )),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // ── DEVICES ──
          AppCard(
            variant: AppCardVariant.glass,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Device Breakdown', style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 16),
                Row(
                  children: [
                    _DeviceCard(label: 'Mobile', pct: '72%', icon: Icons.phone_android),
                    const SizedBox(width: 12),
                    _DeviceCard(label: 'Desktop', pct: '21%', icon: Icons.desktop_windows),
                    const SizedBox(width: 12),
                    _DeviceCard(label: 'Tablet', pct: '7%', icon: Icons.tablet),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 100),
        ],
      ),
    );
  }
}

class _DeviceCard extends StatelessWidget {
  final String label, pct;
  final IconData icon;
  const _DeviceCard({required this.label, required this.pct, required this.icon});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: AppCard(
        variant: AppCardVariant.elevated,
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Icon(icon, color: AppColors.textSecondary, size: 24),
            const SizedBox(height: 8),
            Text(pct, style: Theme.of(context).textTheme.headlineMedium?.copyWith(color: AppColors.accent)),
            Text(label, style: Theme.of(context).textTheme.labelSmall),
          ],
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// TEMPLATE: Billing / Plans Screen
// ═══════════════════════════════════════════════════════════════
class BillingTemplate extends StatefulWidget {
  const BillingTemplate({super.key});

  @override
  State<BillingTemplate> createState() => _BillingTemplateState();
}

class _BillingTemplateState extends State<BillingTemplate> {
  bool _yearly = false;

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      title: 'Billing',
      body: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 20),
        children: [
          const SizedBox(height: 8),

          // ── CURRENT PLAN ──
          AppCard(
            variant: AppCardVariant.accent,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('PRO', style: Theme.of(context).textTheme.headlineLarge?.copyWith(color: AppColors.accent)),
                const SizedBox(height: 4),
                const StatusBadge(label: 'Active', tone: StatusBadgeTone.active),
                const SizedBox(height: 8),
                Text('Next billing: June 8, 2026', style: Theme.of(context).textTheme.bodyMedium),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // ── MONTHLY / YEARLY TOGGLE ──
          Container(
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: AppColors.surface100,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.surface300),
            ),
            child: Row(
              children: ['Monthly', 'Yearly -20%'].asMap().entries.map((e) {
                final active = e.key == (_yearly ? 1 : 0);
                return Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _yearly = e.key == 1),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      decoration: BoxDecoration(
                        color: active ? AppColors.accent : Colors.transparent,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(e.value, textAlign: TextAlign.center, style: TextStyle(
                        color: active ? AppColors.textInverse : AppColors.textSecondary,
                        fontWeight: FontWeight.w600, fontSize: 13,
                      )),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 24),

          // ── PLAN CARDS ──
          ...[
            _PlanData('FREE', 0, ['25 links', '3 Link Pages', 'Basic analytics'], null),
            _PlanData('PRO', _yearly ? 77 : 8, ['500 links', '50 Link Pages', 'API access', 'Advanced analytics'], 'Popular'),
            _PlanData('BUSINESS', _yearly ? 182 : 19, ['Unlimited links', 'Webhooks', '365-day retention', 'Priority support'], 'Best Value'),
          ].map((plan) => Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: AppCard(
              variant: plan.tag != null ? AppCardVariant.accent : AppCardVariant.glass,
              onTap: () {},
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(plan.name, style: Theme.of(context).textTheme.headlineMedium),
                          const SizedBox(height: 4),
                          Text('\$${plan.price}', style: Theme.of(context).textTheme.displayLarge?.copyWith(color: AppColors.accent)),
                          Text(_yearly ? '/year' : '/mo', style: Theme.of(context).textTheme.labelSmall),
                        ],
                      ),
                      if (plan.tag != null) const StatusBadge(label: plan.tag ?? '', tone: StatusBadgeTone.accent),
                    ],
                  ),
                  const SizedBox(height: 16),
                  ...plan.features.map((f) => Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Row(
                      children: [
                        const Icon(Icons.check_circle, color: AppColors.success, size: 18),
                        const SizedBox(width: 10),
                        Text(f, style: Theme.of(context).textTheme.bodyMedium),
                      ],
                    ),
                  )),
                ],
              ),
            ),
          )),
          const SizedBox(height: 100),
        ],
      ),
    );
  }
}

class _PlanData {
  final String name;
  final int price;
  final List<String> features;
  final String? tag;
  const _PlanData(this.name, this.price, this.features, this.tag);
}
