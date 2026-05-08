import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/app_widgets.dart';

class ApiKeysScreen extends StatefulWidget {
  const ApiKeysScreen({super.key});

  @override
  State<ApiKeysScreen> createState() => _ApiKeysScreenState();
}

class _ApiKeysScreenState extends State<ApiKeysScreen> {
  final List<String> _keys = <String>['lsk_live_****************q9K2', 'lsk_live_****************A71p'];
  String? _newKey;

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      title: 'API Keys',
      actions: <Widget>[
        HapticIconButton(icon: Icons.add, label: 'Create API key', onPressed: _create),
      ],
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
        children: <Widget>[
          if (_newKey != null) ...<Widget>[
            AppCard(
              variant: AppCardVariant.accent,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text('New key', style: Theme.of(context).textTheme.titleLarge?.copyWith(color: AppColors.accent)),
                  const SizedBox(height: 8),
                  SelectableText(_newKey!, style: Theme.of(context).textTheme.bodyLarge),
                  const SizedBox(height: 12),
                  AppButton(label: 'Copy Key', icon: Icons.copy, onPressed: () => Clipboard.setData(ClipboardData(text: _newKey!))),
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],
          if (_keys.isEmpty)
            EmptyState(title: 'No API keys', description: 'Create a key to integrate LinkSnap.', actionLabel: 'Create Key', onAction: _create, icon: Icons.key_off)
          else
            ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _keys.length,
              itemBuilder: (context, index) {
                final key = _keys[index];
                return Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Dismissible(
                    key: ValueKey<String>(key),
                    confirmDismiss: (_) async {
                      HapticFeedback.lightImpact();
                      setState(() => _keys.removeAt(index));
                      return false;
                    },
                    background: Container(
                      alignment: Alignment.centerRight,
                      padding: const EdgeInsets.only(right: 20),
                      decoration: BoxDecoration(color: AppColors.error.withOpacity(0.16), borderRadius: BorderRadius.circular(20)),
                      child: const Icon(Icons.delete_outline, color: AppColors.error),
                    ),
                    child: AppCard(
                      variant: AppCardVariant.glass,
                      child: Row(
                        children: <Widget>[
                          const Icon(Icons.key, color: AppColors.accent),
                          const SizedBox(width: 12),
                          Expanded(child: Text(key, style: Theme.of(context).textTheme.bodyLarge, overflow: TextOverflow.ellipsis)),
                          const StatusBadge(label: 'Live', tone: StatusBadgeTone.active),
                        ],
                      ),
                    ).animate().fadeIn(duration: 300.ms, delay: (50 * index).ms).slideY(begin: 0.05),
                  ),
                );
              },
            ),
        ],
      ),
    );
  }

  void _create() {
    HapticFeedback.lightImpact();
    setState(() {
      _newKey = 'lsk_live_${DateTime.now().millisecondsSinceEpoch}';
      _keys.insert(0, 'lsk_live_****************${_newKey!.substring(_newKey!.length - 4)}');
    });
  }
}
