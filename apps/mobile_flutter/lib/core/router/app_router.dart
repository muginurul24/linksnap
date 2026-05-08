import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/presentation/providers/auth_provider.dart';
import '../../features/auth/presentation/screens/login_screen.dart';
import '../../features/auth/presentation/screens/register_screen.dart';
import '../../features/auth/presentation/screens/verify_screen.dart';
import '../../features/billing/presentation/screens/checkout_screen.dart';
import '../../features/billing/presentation/screens/history_screen.dart';
import '../../features/billing/presentation/screens/plans_screen.dart';
import '../../features/campaigns/presentation/screens/campaign_detail_screen.dart';
import '../../features/campaigns/presentation/screens/campaigns_screen.dart';
import '../../features/dashboard/presentation/screens/dashboard_screen.dart';
import '../../features/links/presentation/screens/create_link_screen.dart';
import '../../features/links/presentation/screens/link_analytics_screen.dart';
import '../../features/links/presentation/screens/link_detail_screen.dart';
import '../../features/links/presentation/screens/link_edit_screen.dart';
import '../../features/links/presentation/screens/links_list_screen.dart';
import '../../features/qr/presentation/screens/qr_scanner_screen.dart';
import '../../features/settings/presentation/screens/api_keys_screen.dart';
import '../../features/settings/presentation/screens/profile_screen.dart';
import '../../features/settings/presentation/screens/security_screen.dart';
import '../../features/settings/presentation/screens/settings_screen.dart';
import '../../shared/widgets/app_widgets.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  final refresh = _RouterRefreshNotifier(ref);
  ref.onDispose(refresh.dispose);

  return GoRouter(
    initialLocation: '/dashboard',
    refreshListenable: refresh,
    redirect: (context, state) {
      final auth = ref.read(authProvider);
      final path = state.uri.path;
      final isAuthRoute = path == '/login' || path == '/register' || path == '/verify';
      final isDeepLinkVerify = state.uri.scheme == 'linksnap' && state.uri.host == 'verify';

      if (auth.isLoading) return null;
      if (isDeepLinkVerify) {
        final email = state.uri.queryParameters['email'] ?? '';
        final token = state.uri.queryParameters['token'] ?? '';
        return '/verify?email=$email&token=$token';
      }
      if (!auth.isAuthenticated && !isAuthRoute) return '/login';
      if (auth.isAuthenticated && isAuthRoute) return '/dashboard';
      return null;
    },
    routes: <RouteBase>[
      GoRoute(
        path: '/login',
        pageBuilder: (context, state) => _transition(state, const LoginScreen()),
      ),
      GoRoute(
        path: '/register',
        pageBuilder: (context, state) => _transition(state, const RegisterScreen()),
      ),
      GoRoute(
        path: '/verify',
        pageBuilder: (context, state) => _transition(
          state,
          VerifyScreen(
            email: state.uri.queryParameters['email'],
            token: state.uri.queryParameters['token'],
          ),
        ),
      ),
      ShellRoute(
        builder: (context, state, child) => _MainShell(location: state.uri.path, child: child),
        routes: <RouteBase>[
          GoRoute(path: '/dashboard', pageBuilder: (context, state) => _transition(state, const DashboardScreen())),
          GoRoute(path: '/links', pageBuilder: (context, state) => _transition(state, const LinksListScreen())),
          GoRoute(path: '/create', pageBuilder: (context, state) => _transition(state, const CreateLinkScreen())),
          GoRoute(path: '/campaigns', pageBuilder: (context, state) => _transition(state, const CampaignsScreen())),
          GoRoute(path: '/settings', pageBuilder: (context, state) => _transition(state, const SettingsScreen())),
        ],
      ),
      GoRoute(
        path: '/links/:id',
        pageBuilder: (context, state) => _transition(state, LinkDetailScreen(id: state.pathParameters['id'] ?? '')),
      ),
      GoRoute(
        path: '/links/:id/edit',
        pageBuilder: (context, state) => _transition(state, LinkEditScreen(id: state.pathParameters['id'] ?? '')),
      ),
      GoRoute(
        path: '/links/:id/analytics',
        pageBuilder: (context, state) => _transition(state, LinkAnalyticsScreen(id: state.pathParameters['id'] ?? '')),
      ),
      GoRoute(path: '/billing', pageBuilder: (context, state) => _transition(state, const PlansScreen())),
      GoRoute(path: '/billing/checkout', pageBuilder: (context, state) => _transition(state, const CheckoutScreen())),
      GoRoute(path: '/billing/history', pageBuilder: (context, state) => _transition(state, const BillingHistoryScreen())),
      GoRoute(path: '/settings/profile', pageBuilder: (context, state) => _transition(state, const ProfileScreen())),
      GoRoute(path: '/settings/security', pageBuilder: (context, state) => _transition(state, const SecurityScreen())),
      GoRoute(path: '/settings/api-keys', pageBuilder: (context, state) => _transition(state, const ApiKeysScreen())),
      GoRoute(
        path: '/campaigns/:id',
        pageBuilder: (context, state) => _transition(state, CampaignDetailScreen(id: state.pathParameters['id'] ?? '')),
      ),
      GoRoute(path: '/scan', pageBuilder: (context, state) => _transition(state, const QrScannerScreen())),
    ],
  );
});

CustomTransitionPage<void> _transition(GoRouterState state, Widget child) {
  return CustomTransitionPage<void>(
    key: state.pageKey,
    transitionDuration: const Duration(milliseconds: 260),
    child: child,
    transitionsBuilder: (context, animation, secondaryAnimation, child) {
      final offset = Tween<Offset>(begin: const Offset(0.03, 0), end: Offset.zero).animate(animation);
      return FadeTransition(
        opacity: animation,
        child: SlideTransition(position: offset, child: child),
      );
    },
  );
}

class _RouterRefreshNotifier extends ChangeNotifier {
  _RouterRefreshNotifier(this.ref) {
    ref.listen<AuthState>(authProvider, (_, __) => notifyListeners());
  }

  final Ref ref;
}

class _MainShell extends StatelessWidget {
  const _MainShell({required this.location, required this.child});

  final String location;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      extendBody: true,
      body: child,
      bottomNavigationBar: AppBottomNav(
        currentIndex: _indexFor(location),
        onSelect: (index) => context.go(_pathFor(index)),
      ),
    );
  }

  int _indexFor(String path) {
    if (path.startsWith('/links')) return 1;
    if (path.startsWith('/create')) return 2;
    if (path.startsWith('/campaigns')) return 3;
    if (path.startsWith('/settings')) return 4;
    return 0;
  }

  String _pathFor(int index) {
    return switch (index) {
      0 => '/dashboard',
      1 => '/links',
      2 => '/create',
      3 => '/campaigns',
      4 => '/settings',
      _ => '/dashboard',
    };
  }
}
