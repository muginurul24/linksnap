import 'package:flutter/material.dart';

/// GoPay Merch-inspired premium color palette.
/// Deep charcoal surfaces, gold accents, frosted glass.
class AppColors {
  AppColors._();

  // ── Surfaces ──
  static const surface = Color(0xFF0A0A0B);
  static const surface50 = Color(0xFF09090B);
  static const surface100 = Color(0xFF131316);
  static const surface200 = Color(0xFF1A1A1F);
  static const surface300 = Color(0xFF27272D);

  // ── Accent (Gold) ──
  static const accent = Color(0xFFF59E0B);
  static const accent50 = Color(0xFFFFFBEB);
  static const accent300 = Color(0xFFFCD34D);
  static const accent600 = Color(0xFFD97706);

  // ── Secondary (Teal/Green) ──
  static const secondary = Color(0xFF10B981);

  // ── Content ──
  static const textPrimary = Color(0xFFFAFAFA);
  static const textSecondary = Color(0xFFA1A1AA);
  static const textTertiary = Color(0xFF71717A);
  static const textInverse = Color(0xFF09090B);

  // ── Semantic ──
  static const success = Color(0xFF22C55E);
  static const error = Color(0xFFEF4444);
  static const warning = Color(0xFFF59E0B);
  static const info = Color(0xFF3B82F6);

  // ── Glass ──
  static const glassLight = Color(0x0DFFFFFF);
  static const glassMedium = Color(0x14FFFFFF);
}

/// Accent gradient used for primary buttons, FAB, highlights.
const accentGradient = LinearGradient(
  colors: [AppColors.accent, AppColors.accent600],
  begin: Alignment.topLeft,
  end: Alignment.bottomRight,
);
