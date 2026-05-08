import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

import 'app.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  GoogleFonts.config.allowRuntimeFetching = false;
  await _loadEnvironment();
  runApp(const ProviderScope(child: LinkSnapMobileApp()));
}

Future<void> _loadEnvironment() async {
  for (final fileName in <String>['.env', '.env.example']) {
    try {
      await dotenv.load(fileName: fileName);
      return;
    } catch (_) {
      // Optional mobile env files are loaded when present in the asset bundle.
    }
  }
}
