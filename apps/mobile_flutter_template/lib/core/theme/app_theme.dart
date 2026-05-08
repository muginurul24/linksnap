import 'package:flutter/material.dart';
import 'app_colors.dart';

/// Central dark theme following GoPay Merch premium aesthetic.
class AppTheme {
  AppTheme._();

  static ThemeData get dark => ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        scaffoldBackgroundColor: AppColors.surface,
        colorScheme: const ColorScheme.dark(
          primary: AppColors.accent,
          secondary: AppColors.secondary,
          surface: AppColors.surface100,
          error: AppColors.error,
          onPrimary: AppColors.textInverse,
          onSecondary: AppColors.textInverse,
          onSurface: AppColors.textPrimary,
          onError: AppColors.textPrimary,
        ),

        // ── AppBar ──
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.transparent,
          elevation: 0,
          centerTitle: true,
          titleTextStyle: TextStyle(
            color: AppColors.textPrimary,
            fontSize: 20,
            fontWeight: FontWeight.w600,
            letterSpacing: -0.3,
          ),
          iconTheme: IconThemeData(color: AppColors.textSecondary),
        ),

        // ── Cards ──
        cardTheme: CardThemeData(
          color: AppColors.surface100,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
            side: BorderSide(color: AppColors.surface300.withOpacity(0.5)),
          ),
          margin: EdgeInsets.zero,
        ),

        // ── Inputs ──
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: AppColors.surface200,
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(color: AppColors.surface300),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(color: AppColors.surface300),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: BorderSide(color: AppColors.accent.withOpacity(0.5)),
          ),
          errorBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(color: AppColors.error),
          ),
          hintStyle: const TextStyle(color: AppColors.textTertiary, fontSize: 14),
          prefixIconColor: AppColors.textTertiary,
        ),

        // ── Bottom Nav ──
        bottomNavigationBarTheme: const BottomNavigationBarThemeData(
          backgroundColor: Colors.transparent,
          elevation: 0,
          selectedItemColor: AppColors.accent,
          unselectedItemColor: AppColors.textTertiary,
          type: BottomNavigationBarType.fixed,
          selectedLabelStyle: TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
          unselectedLabelStyle: TextStyle(fontSize: 11, fontWeight: FontWeight.w500),
        ),

        // ── Text ──
        textTheme: const TextTheme(
          displayLarge: TextStyle(fontSize: 44, fontWeight: FontWeight.w800, color: AppColors.textPrimary, letterSpacing: -0.5),
          headlineLarge: TextStyle(fontSize: 30, fontWeight: FontWeight.w700, color: AppColors.textPrimary, letterSpacing: -0.3),
          headlineMedium: TextStyle(fontSize: 24, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
          titleLarge: TextStyle(fontSize: 20, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
          bodyLarge: TextStyle(fontSize: 16, fontWeight: FontWeight.w400, color: AppColors.textPrimary, height: 1.5),
          bodyMedium: TextStyle(fontSize: 14, fontWeight: FontWeight.w400, color: AppColors.textSecondary, height: 1.4),
          labelLarge: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
          labelSmall: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: AppColors.textTertiary, letterSpacing: 0.5),
        ),

        // ── Dividers ──
        dividerTheme: const DividerThemeData(color: AppColors.surface300, thickness: 1),
      );
}
