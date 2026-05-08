import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';

extension ContextNavigation on BuildContext {
  void lightImpact() => HapticFeedback.lightImpact();
}

extension CompactNumber on num {
  String compact() => NumberFormat.compact().format(this);
}

extension DateFormatting on DateTime {
  String get readableDate => DateFormat('EEEE, MMMM d, y').format(this);
  String get shortDate => DateFormat('MMM d, y').format(this);
}
