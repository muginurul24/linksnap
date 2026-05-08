import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/app_widgets.dart';

class QrScannerScreen extends StatelessWidget {
  const QrScannerScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      title: 'Scan QR',
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: <Widget>[
            Expanded(
              child: AppCard(
                variant: AppCardVariant.glass,
                padding: EdgeInsets.zero,
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(20),
                  child: MobileScanner(
                    onDetect: (capture) {
                      HapticFeedback.lightImpact();
                      final code = capture.barcodes.firstOrNull?.rawValue;
                      if (code != null) {
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(code)));
                      }
                    },
                  ),
                ),
              ),
            ),
            const SizedBox(height: 16),
            const ErrorStateWidget(message: 'Camera permission is required if scanning is unavailable.'),
            const SizedBox(height: 16),
            EmptyState(
              title: 'No QR captured yet',
              description: 'Point the camera at a LinkSnap QR code.',
              icon: Icons.qr_code_scanner,
              actionLabel: 'I understand',
              onAction: () => HapticFeedback.lightImpact(),
            ),
          ],
        ),
      ),
    );
  }
}
