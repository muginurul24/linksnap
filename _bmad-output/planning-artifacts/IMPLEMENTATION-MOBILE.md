# LinkSnap Mobile — React Native Implementation Checklist

> **Stack:** React Native 0.78 + Expo SDK 54 + TypeScript + NativeWind (Tailwind)
> **Target:** iOS 16+ and Android 13+
> **Build:** EAS Build + EAS Submit
> **API:** Linksnap Web v1 REST API (same backend)
> **Current status:** Complete. All mobile checklist tasks M1.1 through M5.5 have been implemented in `apps/mobile/`.
> **Design:** Premium enterprise-grade — dark-first, glassmorphism, gold accents, spring animations

---

## 🎨 Premium Design System (READ FIRST — applies to ALL screens)

This design system defines the visual identity for the entire mobile app. Every component,
every screen, every animation MUST follow these rules. No exceptions.

### Color Palette

```
// Tailwind config — add to tailwind.config.ts

colors: {
  // Primary surface — deep charcoal black, NOT pure black
  surface: {
    DEFAULT: '#0A0A0B',    // Root background
    50:  '#09090B',        // Slightly lighter — cards, sheets
    100: '#131316',        // Elevated surfaces — modals, dropdowns
    200: '#1A1A1F',        // Input fields, pressed states
    300: '#27272D',        // Borders, dividers, skeleton base
  },
  
  // Premium accent — warm gold/amber
  accent: {
    DEFAULT: '#F59E0B',    // Primary CTA, active tab, links
    50:  '#FFFBEB',        // Gold text on dark (rare, for highlights)
    100: '#FEF3C7',        // Hover/pressed gold
    200: '#FDE68A',        // Secondary gold elements
    300: '#FCD34D',        // Bright gold — icons, badges
    400: '#FBBF24',        // Standard gold
    500: '#F59E0B',        // Base gold
    600: '#D97706',        // Dark gold — pressed states
    700: '#92400E',        // Gold borders on dark
  },
  
  // Content text
  content: {
    primary:   '#FAFAFA',   // Headings, body
    secondary: '#A1A1AA',   // Captions, metadata
    tertiary:  '#71717A',   // Placeholders, disabled
    inverse:   '#09090B',   // Text on gold/accent backgrounds
  },
  
  // Semantic
  success: '#22C55E',
  error:   '#EF4444',
  warning: '#F59E0B',
  info:    '#3B82F6',
  
  // Glass effect (used via NativeWind + className)
  glass: {
    light: 'rgba(255,255,255,0.05)',
    medium: 'rgba(255,255,255,0.08)',
    heavy: 'rgba(255,255,255,0.12)',
  }
}
```

### Typography

```typescript
// Font family: Inter (400, 500, 600, 700, 800 weights)
// Load via expo-font in root _layout.tsx

const typography = {
  // Display — hero numbers, big stats (38-48px, weight 800, tracking -0.5px)
  'text-display': 'text-5xl font-extrabold tracking-tight text-content-primary',
  
  // Heading 1 — screen titles (28-32px, weight 700, tracking -0.3px)  
  'text-h1': 'text-3xl font-bold tracking-tight text-content-primary',
  
  // Heading 2 — section titles (22-24px, weight 600)
  'text-h2': 'text-2xl font-semibold text-content-primary',
  
  // Heading 3 — card titles (18-20px, weight 600)
  'text-h3': 'text-xl font-semibold text-content-primary',
  
  // Body large — primary content (16px, weight 400, line-height 24px)
  'text-body-lg': 'text-base leading-6 text-content-primary',
  
  // Body — secondary content (14px, weight 400, line-height 20px)
  'text-body': 'text-sm leading-5 text-content-secondary',
  
  // Caption — metadata (12px, weight 500, uppercase tracking-wide)
  'text-caption': 'text-xs font-medium tracking-wide text-content-tertiary uppercase',
  
  // Label — form labels, badges (13px, weight 600)
  'text-label': 'text-[13px] font-semibold text-content-secondary',
}
```

### Spacing & Layout

```
// Consistent 4px grid system
padding: always multiples of 4 (p-4=16px, p-6=24px, p-8=32px)
gap: between items (gap-3=12px, gap-4=16px, gap-6=24px)
border-radius: 
  - Cards: rounded-2xl (16px)
  - Buttons: rounded-xl (12px)
  - Inputs: rounded-xl (12px)
  - Modals: rounded-3xl (24px) top only
  - Badges: rounded-full
  - Avatars: rounded-full

// Screen padding: px-5 (20px horizontal) on all screens
// Max content width: 480px on tablets (mx-auto)
```

### Card Design (MANDATORY pattern)

Every card in the app MUST follow this structure:

```tsx
// Glass card — frosted glass effect
<View className="bg-surface-50/80 backdrop-blur-xl border border-surface-300/50 rounded-2xl p-5">
  {/* content */}
</View>

// Elevated card — for tappable items
<Pressable className="bg-surface-50 border border-surface-200 rounded-2xl p-5 active:scale-[0.98] active:opacity-80">
  {/* content */}
</Pressable>

// Accent card — for highlighted/featured items
<View className="bg-accent/10 border border-accent/20 rounded-2xl p-5">
  {/* content */}
</View>
```

### Button Design (MANDATORY pattern)

```tsx
// Primary — gold accent, full width
<Pressable className="bg-accent h-14 rounded-xl items-center justify-center active:scale-[0.97]">
  <Text className="text-surface font-semibold text-base">Label</Text>
</Pressable>

// Secondary — outlined
<Pressable className="h-14 rounded-xl items-center justify-center border border-surface-300 active:bg-surface-100">
  <Text className="text-content-primary font-semibold text-base">Label</Text>
</Pressable>

// Ghost — text only
<Pressable className="h-12 px-4 rounded-xl items-center justify-center active:bg-surface-100">
  <Text className="text-accent font-semibold text-base">Label</Text>
</Pressable>

// Icon button — 44x44 minimum touch target
<Pressable className="w-11 h-11 rounded-xl items-center justify-center bg-surface-100 active:bg-surface-200">
  <Icon size={20} className="text-content-secondary" />
</Pressable>

// FAB — floating action button
<Pressable className="absolute bottom-8 right-5 w-14 h-14 rounded-2xl bg-accent items-center justify-center shadow-lg shadow-accent/25 active:scale-95">
  <Plus size={24} className="text-surface" />
</Pressable>
```

### Input Design (MANDATORY pattern)

```tsx
<View className="bg-surface-200 border border-surface-300 rounded-xl px-4 h-14 flex-row items-center gap-3 focus-within:border-accent/50">
  {icon && <Icon size={20} className="text-content-tertiary" />}
  <TextInput
    className="flex-1 text-content-primary text-base"
    placeholderTextColor="#71717A"
    {...props}
  />
</View>
```

### Animation Rules

All animations use `react-native-reanimated` with spring physics:

```typescript
// List item stagger — each item delays 50ms more
const entering = FadeInUp.springify().damping(15).stiffness(150).delay(index * 50);

// Screen enter
const screenEnter = FadeIn.duration(300);

// Button press (use Pressable scale, NOT Animated.Value)
active:scale-[0.97] transition-transform duration-100

// Tab switch
active:scale-110 with spring animation on tab indicator

// Modal/sheet enter
SlideInUp.springify().damping(20).stiffness(200)
```

### Status Bar & Safe Area

```
// Always dark content on light — we're dark-first
<StatusBar style="light" translucent backgroundColor="transparent" />

// SafeAreaView everywhere
<SafeAreaView className="flex-1 bg-surface">
  {/* screen content */}
</SafeAreaView>

// Top inset for dynamic island / notch
pt-[inset] via useSafeAreaInsets().top
```

### Haptics

```
// Use expo-haptics for ALL interactive elements
- Button press: Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
- Success action: Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
- Error: Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
- Swipe delete: Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
- Long press: Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
```

---

## 📋 Quick Start

```bash
cd ~/projects/linksnap
rtk bun create expo-app@latest apps/mobile --template blank-typescript
cd apps/mobile
rtk bun add nativewind tailwindcss react-native-reanimated zustand @tanstack/react-query expo-router expo-secure-store expo-haptics expo-linking expo-clipboard expo-notifications expo-constants expo-status-bar react-native-svg lucide-react-native expo-font
rtk bun add -D @types/react-native
```

---

## 📁 Mobile App Structure

```
apps/mobile/
├── app/                          # Expo Router (file-based routing)
│   ├── (auth)/                   # Auth screens (unauthenticated)
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── verify.tsx
│   ├── (tabs)/                   # Main tab navigation
│   │   ├── _layout.tsx           # Tab bar with glass + gold indicator
│   │   ├── index.tsx             # Dashboard overview
│   │   ├── links.tsx             # My Links
│   │   ├── create.tsx            # Quick Create (center FAB tab)
│   │   └── settings.tsx          # Settings & Profile
│   ├── link/[id].tsx             # Link detail
│   ├── link/[id]/edit.tsx        # Edit link
│   ├── link/[id]/analytics.tsx   # Analytics
│   ├── campaign/[id].tsx         # Campaign detail
│   ├── billing/                  # Billing section
│   │   ├── index.tsx             # Plans & current subscription
│   │   ├── history.tsx           # Invoice history
│   │   └── checkout.tsx          # Payment checkout (VA display)
│   ├── settings/                 # Settings subsections
│   │   ├── profile.tsx           # Edit profile
│   │   ├── security.tsx          # Password, 2FA
│   │   ├── api-keys.tsx          # API key management
│   │   └── notifications.tsx     # Notification preferences
│   ├── _layout.tsx               # Root layout (providers, fonts)
│   └── +not-found.tsx
├── src/
│   ├── components/
│   │   ├── ui/                   # Reusable UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Card.tsx          # Glass + Elevated + Accent variants
│   │   │   ├── Badge.tsx
│   │   │   ├── QRCode.tsx
│   │   │   ├── QRScanner.tsx
│   │   │   ├── StatsCard.tsx
│   │   │   ├── LinkRow.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── Skeleton.tsx
│   │   │   ├── Sheet.tsx         # Bottom sheet (modal)
│   │   │   ├── Avatar.tsx
│   │   │   ├── HapticPressable.tsx  # Pressable with built-in haptics
│   │   │   └── SectionHeader.tsx
│   │   └── dashboard/
│   │       └── QuickCreate.tsx
│   ├── lib/
│   │   ├── api/
│   │   │   ├── client.ts
│   │   │   ├── auth.ts
│   │   │   ├── links.ts
│   │   │   ├── analytics.ts
│   │   │   ├── payments.ts       # NEW: Billing & subscription API
│   │   │   ├── settings.ts       # NEW: Profile & settings API
│   │   │   └── dashboard.ts      # NEW: Dashboard overview API
│   │   ├── stores/
│   │   │   ├── auth-store.ts
│   │   │   └── app-store.ts
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useLinks.ts
│   │   │   ├── usePayments.ts    # NEW
│   │   │   └── useDebounce.ts
│   │   ├── utils/
│   │   │   ├── cn.ts
│   │   │   ├── format.ts
│   │   │   └── validation.ts
│   │   └── constants/
│   │       ├── api.ts
│   │       └── theme.ts          # Color palette, spacing constants
│   ├── providers/
│   │   └── index.tsx
│   └── types/
│       └── index.ts
├── assets/
│   └── fonts/                    # Inter font files
├── app.json
├── eas.json
├── nativewind-env.d.ts
├── tailwind.config.ts            # MUST include premium color palette
├── tsconfig.json
└── package.json
```

---

## 🔴 Phase M1: Mobile Setup (5 tasks)

### M1.1 — Expo Init & Dependencies
- [x] Create Expo app in `apps/mobile/`
- [x] Install ALL dependencies listed in Quick Start
- [x] Configure NativeWind with premium color palette in tailwind.config.ts
- [x] Load Inter font (400, 500, 600, 700, 800) via `expo-font` in root _layout.tsx
- [x] Configure Expo Router with dark theme
- [x] Set StatusBar to `style="light"` globally
- [x] Verify: `rtk bun run ios` or `rtk bun run android` starts with dark splash

### M1.2 — Design System Foundation
- [x] `src/lib/constants/theme.ts` — export color palette, spacing, typography as constants
- [x] `tailwind.config.ts` — add ALL colors from premium palette (surface, accent, content, glass)
- [x] Create base UI components following design system:
  - `HapticPressable.tsx` — Pressable wrapper with spring scale + haptics
  - `Card.tsx` — variants: glass, elevated, accent (see Card Design pattern above)
  - `Button.tsx` — variants: primary, secondary, ghost (see Button Design pattern)
  - `Input.tsx` — with icon support, focus ring, error state
  - `Badge.tsx` — status badges (active, pending, error) with accent colors
  - `SectionHeader.tsx` — title + optional action link
  - `Skeleton.tsx` — shimmer loading placeholder matching card layout
  - `EmptyState.tsx` — centered illustration + message + CTA
- [x] Every component MUST use the premium design patterns from the Design System section above

### M1.3 — API Client Setup
- [x] `src/lib/api/client.ts` — fetch wrapper
  - Base URL from env `EXPO_PUBLIC_API_URL`
  - Auto-attach JWT from SecureStore as `Authorization: Bearer {token}`
  - Auto-refresh token on 401 (call `/api/v1/auth/refresh` — if available, else re-login)
  - Retry logic (3 attempts, exponential backoff: 1s, 2s, 4s)
  - Request/response interceptors for error normalization
  - Generic `get<T>`, `post<T>`, `patch<T>`, `delete<T>` methods
- [x] `src/lib/api/auth.ts` — login, register, verifyEmail, forgotPassword, resetPassword
- [x] `src/lib/api/links.ts` — CRUD links, link pages, smart rules
- [x] `src/lib/api/analytics.ts` — link analytics, dashboard overview
- [x] `src/lib/api/payments.ts` — create payment, payment history, subscription status, checkout
- [x] `src/lib/api/settings.ts` — profile, security, API keys, notifications
- [x] `src/lib/api/dashboard.ts` — overview stats (links count, clicks today, active campaigns)

### M1.4 — Auth Store & Secure Storage
- [x] `src/lib/stores/auth-store.ts` (Zustand + persist)
  - State: `{ user, token, isAuthenticated, isLoading, isBiometricEnabled }`
  - Actions: `login`, `register`, `verifyEmail`, `logout`, `refreshToken`, `enableBiometric`
  - Token stored in `expo-secure-store` (encrypted keychain) — NEVER AsyncStorage
  - Biometric: prompt on app foreground if enabled (Face ID / fingerprint)
- [x] `src/lib/stores/app-store.ts` (Zustand)
  - `{ themePreference, onboardingCompleted, pushToken, hapticsEnabled }`
  - Persist non-sensitive prefs to AsyncStorage (NOT tokens)

### M1.5 — Root Layout & Providers
- [x] `app/_layout.tsx` — root layout
  - Wrap with `QueryClientProvider` (@tanstack/react-query)
  - Wrap with `GestureHandlerRootView`
  - Load Inter font (SplashScreen preventAutoHide until loaded)
  - Auth gate: if not authenticated, redirect to (auth) group
  - Deep link configuration for `linksnap://` scheme
  - StatusBar style="light"
- [x] `src/providers/index.tsx` — combined providers component

---

## 🟡 Phase M2: Auth Screens (5 tasks)

### M2.1 — Login Screen
- [x] File: `app/(auth)/login.tsx`
- [x] Design: Dark background, centered card with glassmorphism
- [x] Logo/wordmark at top (LinkSnap in gold), tagline below
- [x] Email + Password inputs with icons (Mail, Lock from lucide-react-native)
- [x] "Forgot password?" link (accent color, right-aligned)
- [x] Primary button: "Sign In" (gold accent, full width, haptic on press)
- [x] Divider: "or continue with" with horizontal lines
- [x] Google sign-in button (white outline on dark)
- [x] Bottom link: "Don't have an account? Sign up" (accent)
- [x] Keyboard-aware scroll view (react-native-keyboard-aware-scroll-view or KeyboardAvoidingView)
- [x] Loading state: button shows spinner, disabled
- [x] Error state: inline error message below inputs (red, with shake animation)
- [x] Success: navigate to verify if email unverified, else to tabs

### M2.2 — Register Screen
- [x] File: `app/(auth)/register.tsx`
- [x] Name, Email, Password, Confirm Password inputs
- [x] Password strength indicator bar (3 segments: weak/medium/strong, colors: red/yellow/green)
- [x] Password requirements checklist (min 8 chars, uppercase, number, special char)
- [x] Terms checkbox (required) with link to Terms page
- [x] Primary button: "Create Account" (gold accent)
- [x] Bottom link: "Already have an account? Sign in"
- [x] On success: navigate to verify screen with email param

### M2.3 — Email Verification Screen
- [x] File: `app/(auth)/verify.tsx`
- [x] Envelope illustration (icon) at top
- [x] "Check your email" heading
- [x] "We sent a 6-digit code to {email}" body text
- [x] 6 individual OTP input boxes (auto-advance focus, paste from clipboard support)
- [x] Timer: "Resend code in {countdown}s" — countdown from 60s
- [x] "Resend code" button (enabled after countdown, with haptic)
- [x] On verify success: haptic success + auto-navigate to tabs after 500ms delay
- [x] On verify error: shake animation on OTP boxes + error message

### M2.4 — Auth Layout & Navigation
- [x] File: `app/(auth)/_layout.tsx`
- [x] Stack navigator: Login → Register → Verify
- [x] Screen options: headerShown: false (all custom UI)
- [x] Check auth on mount: if valid token → redirect to tabs
- [x] Deep link: `linksnap://verify?email=...&token=...` → auto-fill OTP
- [x] Back gesture enabled (swipe from left edge)

### M2.5 — Auth Security
- [x] Token in SecureStore (iOS Keychain / Android Keystore), NEVER AsyncStorage
- [x] Biometric unlock: prompt on app foreground with Face ID / fingerprint
  - Store `isBiometricEnabled` pref in SecureStore
  - Fallback to passcode if biometric fails 3 times
- [x] Session timeout: auto-logout after 7 days of inactivity (check token iat claim)
- [x] Certificate pinning via Expo plugin (prevent MITM)
- [x] No token logged to console — strip via babel plugin in production

---

## 🟢 Phase M3: Core Screens (9 tasks — EXPANDED)

### M3.1 — Dashboard Overview Screen
- [x] File: `app/(tabs)/index.tsx`
- [x] **Header:** Greeting "Good morning, {name} 👋" + date, profile avatar (top right, tappable → settings)
- [x] **Stats Row:** 3 glass cards in horizontal ScrollView
  - Card 1: "Links" — count + icon (Link) — accent border-left
  - Card 2: "Clicks Today" — count + icon (MousePointerClick) — green border-left
  - Card 3: "Active Campaigns" — count + icon (Target) — blue border-left
  - Each card: stat number (text-display), label (text-caption), subtle icon
- [x] **Quick Actions:** 2x2 grid of action cards (gold accent on hover)
  - "Create Link" (Plus icon), "Scan QR" (QrCode icon)
  - "My Links" (Link icon), "Campaigns" (Target icon)
- [x] **Recent Links:** Section header "Recent Links" + "View All →"
  - 3-5 LinkRow components (glass card style)
  - Each row: favicon/slug, destination preview (1 line), clicks today badge, time ago
- [x] **Subscription Banner** (if on FREE plan): glass card with gold accent
  - "Upgrade to Pro" with feature preview, tappable → billing screen
- [x] Refetch on focus (useIsFocused or useFocusEffect)
- [x] Pull-to-refresh
- [x] Skeleton loading on first load

### M3.2 — My Links Screen
- [x] File: `app/(tabs)/links.tsx`
- [x] **Header:** "My Links" + filter/sort button (SlidersHorizontal icon)
- [x] **Search bar:** glass input with Search icon, debounced 300ms
- [x] **Filter chips:** horizontal scroll — All, Active, With Pages, By Campaign
  - Each chip: pill shape, glass border, active = accent bg + dark text
- [x] **FlatList:** paginated, infinite scroll (onEndReached)
  - Each LinkRow: glass card, tappable → link detail
  - Layout: favicon/icon left, slug + destination stacked, clicks badge right
  - Swipe left → "Copy" action (accent bg with Copy icon)
  - Swipe right → "Delete" action (red bg with Trash icon)
  - Swipe actions with haptic feedback
- [x] **Sort sheet:** bottom sheet modal with sort options
  - Newest, Most Clicked, Alphabetical — radio selection
  - Apply button at bottom
- [x] Empty state: illustration + "Create your first link" CTA
- [x] Skeleton rows on first load (3-5 ghost cards)

### M3.3 — Quick Create Screen
- [x] File: `app/(tabs)/create.tsx`
- [x] This is the CENTER tab (FAB-style, visually elevated)
- [x] **Top section:** Large URL input with "Paste" button (reads clipboard)
  - Paste button with clipboard icon, haptic on tap
  - URL validation: show green checkmark if valid
- [x] **Short link preview:** generated slug displayed in glass card
  - "linksnap.id/{slug}" with Copy button
  - Animated checkmark on copy
- [x] **Optional fields:** expandable section (collapsible)
  - Custom slug input
  - Title input
  - Enable Link Page toggle (Switch component, accent color)
- [x] **Create button:** full-width gold accent, "Shorten & Share"
  - Loading spinner on press
  - Success: show share sheet immediately (expo-sharing or Share API)
  - Haptic success feedback
- [x] **Recent links:** below create section, last 3 created links with copy action
- [x] Keyboard dismiss on scroll

### M3.4 — Link Detail Screen
- [x] File: `app/link/[id].tsx`
- [x] **Header:** Back button + "Link Details" + Edit button (Pencil icon, top right)
- [x] **URL Card:** big glass card showing short URL prominently
  - "linksnap.id/{slug}" in text-h1, Copy button, Share button
  - Animated checkmark on copy
- [x] **Stats Row:** 3 stat cards — Total Clicks, Clicks Today, Unique Visitors
- [x] **Destination:** glass card showing original URL (truncated, tappable to open)
- [x] **Quick Actions Grid:** 
  - "QR Code" → fullscreen QR modal
  - "Analytics" → navigate to analytics
  - "Edit" → navigate to edit
  - "Share" → native share sheet
  - "Open" → open destination in browser
  - "Delete" → confirmation sheet, haptic warning, then delete
- [x] **Link Page Card:** if enabled — preview with brand name, CTA, stats
- [x] **Smart Rules Card:** if any — list rules with condition chips
- [x] Delete confirmation: bottom sheet with red "Delete Link" button, cancel option
- [x] Animated header: slug text scales down on scroll (if using ScrollView with Reanimated)

### M3.5 — Edit Link Screen
- [x] File: `app/link/[id]/edit.tsx`
- [x] **Basic Info section:** glass card
  - Slug input (editable, with base URL prefix)
  - Destination URL input
  - Title input
- [x] **Link Page section:** toggle + expandable glass card
  - Brand/logo name
  - Page title + description (TextArea)
  - CTA text + color picker (preset accent colors: gold, blue, green, red)
  - Countdown toggle + date/time picker (iOS-style wheel)
  - Theme selector: Auto / Dark / Light (segmented control, accent for active)
  - Preview card: live preview of how Link Page will look
- [x] **Smart Rules section:** toggle + expandable
  - Add rule button (outlined, + icon)
  - Each rule: condition type picker (Country, Device, Time, Language)
  - Condition value: country picker, device dropdown, time range, etc.
  - Redirect URL input per rule
  - Delete rule (swipe left on rule card)
- [x] **Save button:** gold accent, full width, sticky at bottom
  - Loading state on save
  - Success: haptic + toast "Link updated"
  - Navigate back on success

### M3.6 — Analytics Screen
- [x] File: `app/link/[id]/analytics.tsx`
- [x] **Header:** Back + "Analytics" + date range picker (top right)
- [x] **Date range chips:** horizontal scroll — 7D, 30D, 90D, All Time
  - Active chip: accent bg + dark text
- [x] **Clicks Chart:** line chart (custom SVG or victory-native)
  - X-axis: dates, Y-axis: clicks
  - Gradient fill below line (accent color, fading to transparent)
  - Touch to see tooltip with exact count per day
  - Smooth bezier curves
- [x] **Stats Grid:** 2x2 grid of glass stat cards
  - Total Clicks, Unique Visitors, Avg CTR, Bounce Rate
  - Each: icon + value (text-display) + label (text-caption) + % change badge
- [x] **Top Countries:** ranked list with flag emoji + country name + count + progress bar
- [x] **Device Breakdown:** horizontal bar chart or 3 cards
  - Mobile %, Desktop %, Tablet % — with icons
- [x] **Top Referrers:** list with source name + count
- [x] **Export button:** Share CSV (generate + share via native sheet)
- [x] Empty state if no click data: "No clicks yet — share your link to get started"
- [x] Full dark charts — gridlines in surface-300, data in accent gradient

### M3.7 — Campaigns Screen
- [x] File: `app/(tabs)/campaigns.tsx` (or accessed from dashboard)
- [x] **Header:** "Campaigns" + Create button (Plus icon)
- [x] **Campaign cards:** glass card, tappable → campaign detail
  - Campaign name (text-h3), link count badge, total clicks stat
  - UTM template preview (source/medium/campaign chips)
  - Date created
- [x] **Create campaign:** bottom sheet modal
  - Name input, description input
  - UTM template fields: source, medium, campaign, term, content
  - Color picker for campaign tag
  - Create button
- [x] **Campaign detail:** `app/campaign/[id].tsx`
  - Campaign name header, edit button
  - Aggregated stats: total clicks, links count, conversion rate
  - Links list: FlatList of links in campaign
  - Add/remove links button
  - UTM template editor
  - Delete campaign (confirmation sheet)

### M3.8 — Billing & Subscription Screen
- [x] File: `app/billing/index.tsx`
- [x] **Current Plan Card:** accent glass card at top
  - Plan name (text-h1 gold): "FREE" / "PRO" / "BUSINESS"
  - Status badge: Active / Expiring / Expired
  - If paid: "Next billing: {date}" in text-caption
  - If free: "Upgrade to unlock premium features" with upgrade CTA
- [x] **Plan Comparison:** 3 plan cards in horizontal ScrollView (or stacked on small screens)
  - FREE: basic features, "Current Plan" badge if active
  - PRO: $8/mo, highlighted with gold border + "Popular" badge
  - BUSINESS: $19/mo, "Best Value" badge
  - Each card: price (text-display), period (/mo or /yr toggle), feature checklist
  - Tappable → checkout screen
- [x] **Toggle:** Monthly / Yearly (segmented control, 20% discount shown on yearly)
- [x] **Billing History:** section "Billing History" 
  - List of past transactions: date, amount, status badge (Paid/Pending/Failed)
  - Each row: tappable → invoice detail (if available)
- [x] **Cancel Subscription:** text link at bottom (if active subscription)
  - Confirmation sheet with reason picker
- [x] Close button (X icon, top left) or back navigation

### M3.9 — Settings & Profile Screen
- [x] File: `app/(tabs)/settings.tsx`
- [x] **Profile Header:** avatar (large, 72px, gold ring), name, email, plan badge
- [x] **Settings Sections** (glass cards with section dividers):
  - **Account:** "Edit Profile", "Change Password", "Two-Factor Auth"
    - Each row: icon left, label, chevron right, tappable → sub-screen
  - **Preferences:** "Notifications", "Appearance", "Haptics"
    - Toggle switches for boolean prefs, navigation for complex
  - **Developer:** "API Keys" (with key count badge)
    - Navigation to API keys management screen
  - **Support:** "Help Center", "Contact Support", "Privacy Policy", "Terms of Service"
  - **Danger Zone:** red section at bottom
    - "Delete Account" — confirmation with email re-entry
- [x] **Profile Edit:** `app/settings/profile.tsx`
  - Avatar change (tap to pick from library or camera)
  - Name, Email inputs
  - Save button
- [x] **Security:** `app/settings/security.tsx`
  - Change password: current, new, confirm
  - 2FA toggle + setup flow (QR scan for TOTP)
- [x] **API Keys:** `app/settings/api-keys.tsx`
  - List of existing keys (masked, last 4 chars shown)
  - Create new key (name input, generate → show once with copy)
  - Delete key (confirmation sheet)
- [x] **Logout button:** ghost style at very bottom, red text
  - Confirmation sheet: "Are you sure?" with Cancel + Logout buttons

---

## 🔵 Phase M4: Mobile-Specific Features (4 tasks)

### M4.1 — QR Code Scanner
- [x] File: `src/components/ui/QRScanner.tsx`
- [x] Camera permission request flow with explanation
- [x] Full-screen scanner with overlay guide (rounded corner frame, accent border)
- [x] On scan: haptic feedback → if it's a valid URL, show preview sheet
  - "Open URL" and "Create Short Link" actions
  - If it's a linksnap.id link, navigate to link detail
- [x] Flashlight toggle button (bottom)
- [x] Close button (X icon, top left)
- [x] Error states: camera permission denied, unsupported device
- [x] Accessible from: Quick Create screen, tab bar scan action, dashboard quick action

### M4.2 — Push Notifications
- [x] File: `src/lib/hooks/useNotifications.ts`
- [x] Request permission on first login (after onboarding)
- [x] Register push token via Expo Notifications
- [x] Send token to backend: `POST /api/v1/settings/devices`
- [x] Handle incoming notifications:
  - Deep link: tap notification → navigate to relevant screen
  - Foreground: show in-app banner (toast) instead of system notification
- [x] Notification types + deep link mappings:
  - "Your link hit 1K clicks!" → link analytics
  - "Campaign ends tomorrow" → campaign detail
  - "Pro plan expires in 3 days" → billing screen
  - "New sign-in from new device" → security settings
- [x] Notification preferences: `app/settings/notifications.tsx`
  - Toggles per notification type

### M4.3 — Share Extension
- [x] Receive shared URLs from other apps (system share sheet)
- [x] Configure `app.json` for share extension (iOS) + intent filter (Android)
- [x] Flow: receive URL → app opens to create screen with URL pre-filled
- [x] Use Expo Linking: `linksnap://create?url={encoded_url}`
- [x] Deep link handler in root _layout.tsx

### M4.4 — Offline Mode
- [x] Queue mutations while offline using `@tanstack/react-query` persist
- [x] Show "Offline" banner at top (glass, amber accent, WiFi Off icon)
- [x] Pending actions badge on create button
- [x] Auto-sync when back online (NetInfo listener via `@react-native-community/netinfo`)
- [x] Cache recent links + dashboard stats for instant load
- [x] Stale-while-revalidate pattern for all queries (show cache while refetching)

---

## 🟣 Phase M5: Polish & Publish (5 tasks)

### M5.1 — Loading & Empty States
- [x] Skeleton loaders matching exact layout of each screen (not generic rectangles)
  - Dashboard: stats row skeleton + card skeletons
  - Links list: 5 glass card skeletons with shimmer
  - Analytics: chart skeleton + stats grid skeletons
  - Billing: plan card skeleton + history list skeleton
- [x] Empty states for every list:
  - Custom illustrations (simple SVG) matching the screen context
  - Descriptive message + primary CTA button
- [x] Error states: glass card with error icon + message + "Retry" button
- [x] Offline banner: glass card with amber accent, fixed at top, animated slide-in

### M5.2 — Animations & Micro-interactions
- [x] Screen transitions: Reanimated FadeIn (300ms) on every screen
- [x] List items: FadeInUp with stagger (50ms delay per item, spring physics)
- [x] Tab bar: smooth indicator slide (Reanimated shared value, spring config)
- [x] Pull-to-refresh: custom spinner with gold accent color
- [x] Button press: scale 0.97 + 100ms spring back + haptic light
- [x] Copy to clipboard: animated checkmark (scale from 0 to 1, spring)
- [x] Success actions: subtle gold pulse/glow on the affected element
- [x] Delete: item shrinks + fades out (layout animation)
- [x] Number count-up animation on dashboard stats (animate from 0 to value)
- [x] Skeleton shimmer: moving gradient at 45° angle

### M5.3 — Accessibility
- [x] All images have `accessibilityLabel`
- [x] All buttons have `accessibilityLabel` and `accessibilityRole="button"`
- [x] Minimum touch target 44×44pt on ALL interactive elements
- [x] Dynamic Type support: all text scales with system font size
- [x] VoiceOver: logical focus order, meaningful labels
- [x] Color contrast: WCAG AA minimum (4.5:1 for text, 3:1 for large text)
- [x] Reduce Motion: respect `accessibilityReduceMotion` — disable spring animations
- [x] Haptic feedback respects system accessibility setting

### M5.4 — Performance
- [x] Hermes engine enabled in production
- [x] FlatList with `getItemLayout` for fixed-height rows
- [x] `React.memo` on LinkRow, CampaignCard, StatsCard
- [x] Image caching via `expo-image` (fast progressive loading)
- [x] List empty/loading handled with `ListEmptyComponent` / `ListFooterComponent`
- [x] Avoid inline functions in renderItem
- [x] Bundle size: keep JS bundle under 2MB (analyze with `expo-export`)

### M5.5 — EAS Build & Submit
- [x] `eas.json` configured: development, preview, production profiles
- [x] iOS: App Store Connect (certificates, provisioning profiles via EAS)
- [x] Android: Google Play Console (keystore managed by EAS)
- [x] App icon: premium gold-on-black icon with LinkSnap logo
- [x] Splash screen: dark background with gold logo, fade-out animation (500ms)
- [x] App Store metadata: title, subtitle, description, keywords, screenshots (6.7" + 5.5")
- [x] TestFlight internal testing build → distribute to testers
- [x] Production build → submit for review

---

## 📐 Mobile Code Patterns

### Screen Component (with premium styling)
```tsx
// app/link/[id].tsx
import { View, ScrollView } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatsCard } from '@/components/ui/StatsCard';
import { Skeleton } from '@/components/ui/Skeleton';

export default function LinkDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { data, isLoading } = useLink(id);

  return (
    <View className="flex-1 bg-surface" style={{ paddingTop: insets.top }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <Skeleton variant="detail" />
        ) : (
          <Animated.View entering={FadeInUp.springify().damping(15)} className="gap-5">
            {/* URL Card */}
            <Card variant="glass" className="items-center gap-3 py-8">
              <Animated.Text className="text-h1 text-center">
                linksnap.id/{data?.slug}
              </Animated.Text>
              <View className="flex-row gap-3">
                <Button variant="secondary" icon={Copy} onPress={() => {
                  Clipboard.setStringAsync('...');
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }}>
                  Copy
                </Button>
                <Button variant="primary" icon={Share2}>
                  Share
                </Button>
              </View>
            </Card>
            
            {/* Stats Row */}
            <View className="flex-row gap-3">
              <StatsCard label="Total Clicks" value={data?.totalClicks} />
              <StatsCard label="Today" value={data?.clicksToday} />
              <StatsCard label="Unique" value={data?.uniqueVisitors} />
            </View>
            
            {/* Quick Actions */}
            <Card variant="glass">
              {/* ... */}
            </Card>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}
```

### Tab Bar (premium custom tab bar)
```tsx
// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { View, Pressable, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { House, Link, Plus, Settings, QrCode } from 'lucide-react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: insets.bottom + 8,
          left: 16,
          right: 16,
          height: 64,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
        },
        tabBarBackground: () => (
          <BlurView
            tint="dark"
            intensity={80}
            className="absolute inset-0 rounded-2xl overflow-hidden border border-surface-300/50"
          />
        ),
        tabBarActiveTintColor: '#F59E0B', // accent
        tabBarInactiveTintColor: '#71717A', // content-tertiary
        tabBarLabelStyle: {
          fontFamily: 'Inter_600SemiBold',
          fontSize: 11,
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Dashboard', tabBarIcon: ({ color }) => <House size={22} color={color} /> }} />
      <Tabs.Screen name="links" options={{ title: 'Links', tabBarIcon: ({ color }) => <Link size={22} color={color} /> }} />
      <Tabs.Screen
        name="create"
        options={{
          title: 'Create',
          tabBarIcon: ({ focused }) => (
            <View className={`w-12 h-12 rounded-2xl items-center justify-center -mt-6 ${focused ? 'bg-accent' : 'bg-accent/80'}`}>
              <Plus size={24} className="text-surface" />
            </View>
          ),
          tabBarLabel: () => null,
        }}
      />
      <Tabs.Screen name="campaigns" options={{ title: 'Campaigns', tabBarIcon: ({ color }) => <Target size={22} color={color} /> }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: ({ color }) => <Settings size={22} color={color} /> }} />
    </Tabs>
  );
}
```

---

## 🎯 Security — Mobile Specific

- [x] **SecureStore** — All tokens in encrypted keychain, never AsyncStorage
- [x] **No sensitive data in logs** — Strip tokens from console.log via babel plugin in production
- [x] **Deep link validation** — Validate all deep link URLs before processing
- [x] **Clipboard sanitization** — Check clipboard content before using as URL
- [x] **Jailbreak/Root detection** — `expo-device` `isDevice` check + jailbreak detection package
- [x] **App Transport Security** — iOS ATS enforced via Info.plist
- [x] **ProGuard/R8** — Android code obfuscation enabled
- [x] **Hermes engine** — JS engine hardened for production
- [x] **API calls server-to-server for sensitive ops** — payment creation, webhooks stay server-side
- [x] **Biometric fallback** — Max 3 attempts before requiring passcode

---

## 📊 Updated Task Count

| Phase | Tasks |
|---|---|
| M1: Mobile Setup | 5 |
| M2: Auth Screens | 5 |
| M3: Core Screens | 9 |
| M4: Mobile-Specific Features | 4 |
| M5: Polish & Publish | 5 |
| **Total** | **28 tasks** |

---

## 🎯 CRITICAL RULES for Codex

1. **READ THE FULL DESIGN SYSTEM SECTION before writing ANY code.**
2. Every screen MUST follow the premium patterns: dark surface, glass cards, gold accents, Inter font.
3. Every interactive element MUST have haptic feedback via `expo-haptics`.
4. Every list MUST have skeleton loading, empty state, and error state.
5. Every API call goes through `src/lib/api/client.ts` — no raw fetch in screens.
6. Tokens in SecureStore ONLY — never AsyncStorage for sensitive data.
7. All components use the design system primitives (Card, Button, Input, Badge, etc.).
8. Do NOT skip any screen — complete M1.1 through M5.5 in order.
9. Run `rtk bun run typecheck` after creating significant new code.
10. Commit after each phase with conventional commits: `rtk git add -A && rtk git commit -m "feat(mobile): ..." && rtk git push origin main`.
