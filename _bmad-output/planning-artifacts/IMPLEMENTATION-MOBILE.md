# LinkSnap Mobile — React Native Implementation Checklist

> **Stack:** React Native 0.78 + Expo SDK 54 + TypeScript + NativeWind (Tailwind)
> **Target:** iOS 16+ and Android 13+
> **Build:** EAS Build + EAS Submit

---

## 📋 Quick Start

```bash
cd ~/projects/linksnap
rtk bun create expo-app@latest apps/mobile --template blank-typescript
cd apps/mobile
rtk bun add nativewind tailwindcss react-native-reanimated zustand @tanstack/react-query expo-router expo-camera expo-notifications expo-secure-store expo-haptics expo-linking expo-clipboard react-native-svg react-native-qrcode-svg lucide-react-native
rtk bun add -D @types/react-native
```

---

## 📁 Mobile App Structure

```
apps/mobile/
├── app/                          # Expo Router (file-based routing)
│   ├── (auth)/                   # Auth screens
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── verify.tsx
│   ├── (tabs)/                   # Main tab navigation
│   │   ├── _layout.tsx           # Tab bar config
│   │   ├── index.tsx             # Home / Quick Create
│   │   ├── links.tsx             # My Links
│   │   ├── campaigns.tsx         # Campaigns
│   │   └── settings.tsx          # Settings
│   ├── link/[id].tsx             # Link detail
│   ├── link/[id]/edit.tsx        # Edit link
│   ├── link/[id]/analytics.tsx   # Analytics
│   ├── link-page/[id].tsx        # Link Page detail
│   ├── campaign/[id].tsx         # Campaign detail
│   ├── _layout.tsx               # Root layout (providers)
│   └── +not-found.tsx
├── src/
│   ├── components/
│   │   ├── ui/                   # Reusable UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── QRCode.tsx        # QR code display/generation
│   │   │   ├── QRScanner.tsx     # Camera QR scanner
│   │   │   ├── StatsCard.tsx
│   │   │   ├── LinkRow.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── Skeleton.tsx
│   │   │   └── SonnerToast.tsx
│   │   └── dashboard/
│   │       └── QuickCreate.tsx    # Floating create button
│   ├── lib/
│   │   ├── api/                  # API client
│   │   │   ├── client.ts         # fetch wrapper with auth + retry
│   │   │   ├── auth.ts
│   │   │   ├── links.ts
│   │   │   ├── campaigns.ts
│   │   │   └── analytics.ts
│   │   ├── stores/               # Zustand stores
│   │   │   ├── auth-store.ts
│   │   │   └── app-store.ts
│   │   ├── hooks/                # Custom hooks
│   │   │   ├── useAuth.ts
│   │   │   ├── useLinks.ts
│   │   │   └── useDebounce.ts
│   │   ├── utils/
│   │   │   ├── cn.ts             # className merge
│   │   │   ├── format.ts         # Number/date formatting
│   │   │   └── validation.ts     # Zod schemas (shared with web via packages/shared)
│   │   └── constants/
│   │       └── api.ts            # API base URL
│   ├── providers/
│   │   └── index.tsx             # QueryClient, Auth, Theme providers
│   └── types/
│       └── index.ts
├── assets/                       # Images, fonts, icons
├── app.json                      # Expo config
├── eas.json                      # EAS Build config
├── nativewind-env.d.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 🔴 Phase M1: Mobile Setup (4 tasks)

### M1.1 — Expo Init & Dependencies
- [ ] Create Expo app in `apps/mobile/`
- [ ] Install all dependencies listed above
- [ ] Configure NativeWind (Tailwind for React Native)
- [ ] Configure Expo Router
- [ ] Verify: `rtk bun run ios` or `rtk bun run android` starts

### M1.2 — Monorepo Integration
- [ ] `apps/mobile/package.json` with workspace reference
- [ ] Shared types: `import { Link, User } from "@linksnap/shared"`
- [ ] Shared Zod schemas: `import { createLinkSchema } from "@linksnap/shared"`
- [ ] API base URL configuration via environment

### M1.3 — API Client Setup
- [ ] `src/lib/api/client.ts` — fetch wrapper
  - Base URL from env `EXPO_PUBLIC_API_URL`
  - Auto-attach JWT from SecureStore
  - Auto-refresh token on 401
  - Retry logic (3 attempts, exponential backoff)
  - Request/response interceptors for logging
- [ ] `src/lib/api/auth.ts` — Auth API functions
- [ ] `src/lib/api/links.ts` — Links CRUD API functions
- [ ] `src/lib/api/analytics.ts` — Analytics API functions

### M1.4 — Auth Store & Secure Storage
- [ ] `src/lib/stores/auth-store.ts` (Zustand)
  - User state: `{ user, token, isAuthenticated, isLoading }`
  - Actions: `login`, `register`, `verifyEmail`, `logout`, `refreshToken`
  - Token stored in `expo-secure-store` (encrypted keychain)
- [ ] Companion Zustand for app state: `src/lib/stores/app-store.ts`
  - Theme preference, onboarding completed, notification token

---

## 🟡 Phase M2: Auth Screens (5 tasks)

### M2.1 — Login Screen
- File: `app/(auth)/login.tsx`
- Email + Password fields with validation
- "Sign in with Google" — Expo Auth Session with Google OAuth
- Error handling: invalid credentials, email not verified, rate limited
- Keyboard-aware scroll view
- Loading state on submit button
- Haptic feedback on error

### M2.2 — Register Screen
- File: `app/(auth)/register.tsx`
- Name, Email, Password, Confirm Password
- Password strength indicator (weak/medium/strong)
- Terms of Service checkbox (required)
- On success: navigate to verify screen with email param

### M2.3 — Email Verification Screen
- File: `app/(auth)/verify.tsx`
- 6-digit OTP input (auto-advance, paste from clipboard)
- Countdown timer for resend (60s)
- Success state → auto-navigate to tabs

### M2.4 — Auth Navigation
- File: `app/(auth)/_layout.tsx`
- Stack navigator: Login → Register → Verify
- Check auth state on mount: if authenticated, redirect to tabs
- Deep link handling: `linksnap://verify?email=...&token=...`

### M2.5 — Auth Security
- Token storage: `expo-secure-store` (iOS Keychain / Android Keystore)
- Biometric unlock: Optional Face ID / fingerprint for quick re-auth
- Session timeout: Auto-logout after 7 days of inactivity
- Certificate pinning via Expo plugins (prevent MITM)

---

## 🟢 Phase M3: Core Screens (7 tasks)

### M3.1 — Home Screen (Quick Create)
- File: `app/(tabs)/index.tsx`
- Quick link creation: paste URL → generate short link instantly
- Recent links list (last 5)
- Pull-to-refresh
- Stats summary at top: "X links · Y clicks today"
- Floating "Create Link" FAB button
- Empty state: "Paste a long URL to shorten it"

### M3.2 — My Links Screen
- File: `app/(tabs)/links.tsx`
- FlatList with links (paginated, infinite scroll)
- Each row: slug, destination preview, clicks, status indicator
- Swipe actions: Copy URL (left), Delete (right)
- Search bar at top (debounced)
- Sort: newest, most clicked, alphabetical
- Pull-to-refresh
- Empty state: cute illustration + "Create your first link"

### M3.3 — Link Detail Screen
- File: `app/link/[id].tsx`
- Full link details: slug, destination, created date, status
- Action buttons: Copy, Share, Open, Edit, Delete
- QR code display (large, tappable to fullscreen)
- Click stats summary (total, today, top country)
- "View Full Analytics" button

### M3.4 — Edit Link Screen
- File: `app/link/[id]/edit.tsx`
- Edit slug, destination, title
- Toggle: Link Page enabled/disabled
- Link Page config expandable section:
  - Brand name, title, description
  - CTA text + color picker
  - Countdown toggle + date picker
  - Theme selector (auto/dark/light)
- Save button with loading state
- Haptic feedback on save

### M3.5 — Analytics Screen
- File: `app/link/[id]/analytics.tsx`
- Chart: clicks per day (last 7/30/90 days) — use `react-native-svg` + custom chart or `victory-native`
- Stats grid: total clicks, unique visitors, CTR
- Top countries list
- Device breakdown (pie chart)
- Referrer list
- Date range picker
- Share/Export button

### M3.6 — QR Code Scanner
- File: `src/components/ui/QRScanner.tsx`
- Camera permission request flow
- Full-screen scanner with overlay guide
- On scan: parse URL → if it's a linksnap.id link, navigate to link detail
- Flashlight toggle
- Haptic feedback on successful scan
- Error handling: camera permission denied, unsupported device

### M3.7 — Campaigns Screen
- File: `app/(tabs)/campaigns.tsx`
- Campaign cards with: name, link count, total clicks
- Tap → navigate to campaign detail
- Campaign detail: `app/campaign/[id].tsx`
  - Links in campaign (FlatList)
  - Aggregated stats
  - Edit UTM templates
  - Add/remove links

---

## 🔵 Phase M4: Mobile-Specific Features (4 tasks)

### M4.1 — Share Extension
- File: `plugins/share-extension.ts` (Expo Config Plugin)
- iOS Share Extension: "Share to LinkSnap" appears in system share sheet
- Android Intent Filter: Receive shared URLs from other apps
- Flow: Receive URL → preview → shorten → copy to clipboard
- Use `expo-share-intent` or custom config plugin

### M4.2 — Push Notifications
- File: `src/lib/hooks/useNotifications.ts`
- Register for push via Expo Notifications
- Send token to backend `/api/v1/users/device-token`
- Notification types:
  - "Your link just hit 1,000 clicks! 🎉"
  - "Campaign 'Ramadhan Sale' ends tomorrow"
  - "Your Pro plan expires in 3 days"
- Deep link from notification to relevant screen

### M4.3 — Widget (iOS + Android)
- File: `widgets/QuickShorten.tsx` (React Native Widget)
- Home screen widget: "Paste URL to shorten"
- Quick stats widget: "234 links · 8.9K clicks today"
- Tap widget → open app to relevant screen
- Use `react-native-widget-extension` or custom native module

### M4.4 — Offline Mode
- Queue link creations while offline using `@tanstack/query-persist-client`
- Show pending links with "Syncing..." badge
- Sync when back online (NetInfo listener)
- Cache recent links for instant load

---

## 🟣 Phase M5: Polish & Publish (4 tasks)

### M5.1 — Loading & Empty States
- Skeleton loaders matching content layout (every screen)
- Empty states with illustrations + CTA (every list)
- Error states with retry button (every screen)
- Offline indicator banner at top

### M5.2 — Animations & Micro-interactions
- Screen transitions: shared element where possible
- Pull-to-refresh: custom spinner
- Button press: scale animation + haptic
- Copy to clipboard: success checkmark animation
- QR scan success: confetti animation
- Tab bar: smooth indicator slide

### M5.3 — Accessibility
- All images have `accessibilityLabel`
- Minimum touch target 44×44pt
- Dynamic Type support (font scaling)
- VoiceOver labels on all interactive elements
- Sufficient color contrast (WCAG AA)
- Reduce motion support

### M5.4 — EAS Build & Submit
- [ ] `eas.json` configured: development, preview, production profiles
- [ ] iOS: App Store Connect setup (certificates, profiles)
- [ ] Android: Google Play Console setup (keystore, signing)
- [ ] App icons and splash screen via `expo-asset-utils`
- [ ] App Store metadata: description, screenshots, keywords
- [ ] TestFlight / Internal Testing build
- [ ] Production build → submit for review

---

## 📐 Mobile Code Patterns

### API Call Pattern
```typescript
// src/lib/api/links.ts
import { apiClient } from "./client";
import type { Link, PaginatedResponse } from "@linksnap/shared";

export async function getUserLinks(page = 1): Promise<PaginatedResponse<Link>> {
  return apiClient.get(`/v1/links?page=${page}&limit=20`);
}

export async function createLink(data: {
  destinationUrl: string;
  slug?: string;
  title?: string;
}): Promise<Link> {
  return apiClient.post("/v1/links", data);
}
```

### Screen Component Pattern
```typescript
// app/(tabs)/links.tsx
import { FlatList, RefreshControl } from "react-native";
import { useLinks } from "@/lib/hooks/useLinks";
import { LinkRow } from "@/components/ui/LinkRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";

export default function LinksScreen() {
  const { data, isLoading, error, refetch } = useLinks();

  if (isLoading) return <Skeleton />;
  if (!data?.length) return <EmptyState message="No links yet" action="Create Link" />;

  return (
    <FlatList
      data={data}
      renderItem={({ item }) => <LinkRow link={item} />}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
    />
  );
}
```

---

## 🎯 Security — Mobile Specific

- [ ] **Certificate pinning** — Prevent MITM attacks
- [ ] **SecureStore** — All tokens in encrypted keychain, never AsyncStorage
- [ ] **No sensitive data in logs** — Strip tokens from console.log via babel plugin
- [ ] **Deep link validation** — Validate all deep link URLs before processing
- [ ] **Clipboard sanitization** — Check clipboard content before using as URL
- [ ] **Jailbreak/Root detection** — Warn user (not block) on compromised devices
- [ ] **App Transport Security** — iOS ATS enforced
- [ ] **ProGuard/R8** — Android code obfuscation enabled
- [ ] **Hermes engine** — JS engine hardened for production
