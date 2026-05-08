import 'package:flutter/material.dart';

/// GoPay Merch-inspired premium color palette.
class AppColors {
  AppColors._();

  static const surface = Color(0xFF0A0A0B);
  static const surface50 = Color(0xFF09090B);
  static const surface100 = Color(0xFF131316);
  static const surface200 = Color(0xFF1A1A1F);
  static const surfaceField = Color(0xFF1E1E24);
  static const surface300 = Color(0xFF27272D);
  static const surfaceBorder = Color(0xFF27272D);

  static const accent = Color(0xFFF59E0B);
  static const accent50 = Color(0xFFFFFBEB);
  static const accent300 = Color(0xFFFCD34D);
  static const accent600 = Color(0xFFD97706);

  static const secondary = Color(0xFF10B981);
  static const secondaryLight = Color(0xFF34D399);
  static const secondaryDark = Color(0xFF059669);

  static const textPrimary = Color(0xFFFAFAFA);
  static const textSecondary = Color(0xFFA1A1AA);
  static const textTertiary = Color(0xFF71717A);
  static const textInverse = Color(0xFF09090B);

  static const success = Color(0xFF22C55E);
  static const error = Color(0xFFEF4444);
  static const warning = Color(0xFFF59E0B);
  static const info = Color(0xFF3B82F6);

  static const glassLight = Color(0x0DFFFFFF);
  static const glassMedium = Color(0x14FFFFFF);
  static const glassHeavy = Color(0x1FFFFFFF);
}

const accentGradient = LinearGradient(
  colors: <Color>[AppColors.accent, AppColors.accent600],
  begin: Alignment.topLeft,
  end: Alignment.bottomRight,
);
