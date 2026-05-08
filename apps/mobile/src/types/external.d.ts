declare const __DEV__: boolean;
declare const process: { env: Record<string, string | undefined> };

declare namespace JSX {
  type Element = import("react").ReactElement;
  interface IntrinsicElements {
    [elementName: string]: Record<string, unknown>;
  }
}

declare module "*.svg" {
  const source: string;
  export default source;
}

declare module "*.png" {
  const source: string;
  export default source;
}

declare module "react-native" {
  import type React from "react";

  export type ColorValue = string;
  export type AppStateStatus = "active" | "background" | "inactive" | "unknown" | "extension";
  export type ListRenderItemInfo<T> = { item: T; index: number };
  export type RefreshControlProps = Record<string, unknown>;

  export const View: React.ComponentType<Record<string, unknown>>;
  export const Text: React.ComponentType<Record<string, unknown>>;
  export const Pressable: React.ComponentType<Record<string, unknown>>;
  export const TextInput: React.ComponentType<Record<string, unknown>>;
  export const ScrollView: React.ComponentType<Record<string, unknown>>;
  export const FlatList: React.ComponentType<Record<string, unknown>>;
  export const ActivityIndicator: React.ComponentType<Record<string, unknown>>;
  export const KeyboardAvoidingView: React.ComponentType<Record<string, unknown>>;
  export const Modal: React.ComponentType<Record<string, unknown>>;
  export const Switch: React.ComponentType<Record<string, unknown>>;
  export const RefreshControl: React.ComponentType<Record<string, unknown>>;
  export const Share: { share: (content: { message?: string; url?: string; title?: string }) => Promise<unknown> };
  export const Linking: {
    openURL: (url: string) => Promise<void>;
    canOpenURL: (url: string) => Promise<boolean>;
  };
  export const Platform: { OS: "ios" | "android" | "web"; select: <T>(values: Record<string, T>) => T };
  export const AppState: {
    currentState: AppStateStatus;
    addEventListener: (
      type: "change",
      listener: (state: AppStateStatus) => void,
    ) => { remove: () => void };
  };
}

  export const FadeIn: {
    duration: (duration: number) => unknown;
    springify: () => { damping: (value: number) => unknown };
  };
  export const FadeInUp: {
    springify: () => {
      damping: (value: number) => {
        stiffness: (value: number) => { delay: (value: number) => unknown };
      };
    };
  };
  export const SlideInUp: {
    springify: () => {
      damping: (value: number) => {
        stiffness: (value: number) => unknown;
      };
    };
  };
  export const Layout: { springify: () => unknown };
  export function useSharedValue<T>(value: T): { value: T };
  export function useAnimatedStyle<T>(callback: () => T): T;
  export function withSpring<T>(value: T, config?: Record<string, unknown>): T;
  export function withTiming<T>(value: T, config?: Record<string, unknown>): T;
  export function withRepeat<T>(value: T, count?: number, reverse?: boolean): T;
  export function useReducedMotion(): boolean;
  const Animated: React.ComponentType<Record<string, unknown>> & {
    View: React.ComponentType<Record<string, unknown>>;
    Text: React.ComponentType<Record<string, unknown>>;
    createAnimatedComponent: <P>(component: React.ComponentType<P>) => React.ComponentType<P & Record<string, unknown>>;
  };
  export default Animated;
}

declare module "expo-router" {
  import type React from "react";

  export const Stack: React.ComponentType<Record<string, unknown>> & {
    Screen: React.ComponentType<Record<string, unknown>>;
  };
  export const Tabs: React.ComponentType<Record<string, unknown>> & {
    Screen: React.ComponentType<Record<string, unknown>>;
  };
  export const Slot: React.ComponentType<Record<string, unknown>>;
  export const Redirect: React.ComponentType<{ href: string }>;
  export const Link: React.ComponentType<Record<string, unknown>>;
  export const router: {
    replace: (href: string) => void;
    push: (href: string) => void;
    back: () => void;
    canGoBack: () => boolean;
  };
  export function useRouter(): typeof router;
  export function useLocalSearchParams<T extends Record<string, string | undefined> = Record<string, string | undefined>>(): T;
  export function usePathname(): string;
  export function useFocusEffect(callback: () => void | (() => void)): void;
}

declare module "expo-secure-store" {
  export function getItemAsync(key: string): Promise<string | null>;
  export function setItemAsync(key: string, value: string): Promise<void>;
  export function deleteItemAsync(key: string): Promise<void>;
}

declare module "expo-haptics" {
  export enum ImpactFeedbackStyle {
    Light = "light",
    Medium = "medium",
    Heavy = "heavy",
  }
  export enum NotificationFeedbackType {
    Success = "success",
    Warning = "warning",
    Error = "error",
  }
  export function impactAsync(style: ImpactFeedbackStyle): Promise<void>;
  export function notificationAsync(type: NotificationFeedbackType): Promise<void>;
}

declare module "expo-status-bar" {
  import type React from "react";
  export const StatusBar: React.ComponentType<Record<string, unknown>>;
}

declare module "expo-font" {
  export function useFonts(fontMap: Record<string, unknown>): [boolean, Error | null];
}

declare module "@expo-google-fonts/inter" {
  export const Inter_400Regular: unknown;
  export const Inter_500Medium: unknown;
  export const Inter_600SemiBold: unknown;
  export const Inter_700Bold: unknown;
  export const Inter_800ExtraBold: unknown;
}

declare module "expo-splash-screen" {
  export function preventAutoHideAsync(): Promise<void>;
  export function hideAsync(): Promise<void>;
}

declare module "expo-linking" {
  export function createURL(path: string): string;
  export function addEventListener(
    type: "url",
    listener: (event: { url: string }) => void,
  ): { remove: () => void };
  export function getInitialURL(): Promise<string | null>;
  export function parse(url: string): { path: string | null; queryParams: Record<string, string | undefined> | null };
}

declare module "expo-clipboard" {
  export function getStringAsync(): Promise<string>;
  export function setStringAsync(value: string): Promise<void>;
}

declare module "expo-notifications" {
  export type Notification = { request: { content: { data?: Record<string, unknown>; title?: string; body?: string } } };
  export function getPermissionsAsync(): Promise<{ status: string }>;
  export function requestPermissionsAsync(): Promise<{ status: string }>;
  export function getExpoPushTokenAsync(): Promise<{ data: string }>;
  export function setNotificationHandler(handler: Record<string, unknown>): void;
  export function addNotificationReceivedListener(listener: (notification: Notification) => void): { remove: () => void };
  export function addNotificationResponseReceivedListener(listener: (response: { notification: Notification }) => void): { remove: () => void };
}

declare module "expo-constants" {
  const Constants: { expoConfig?: { extra?: Record<string, unknown> } };
  export default Constants;
}

declare module "expo-camera" {
  import type React from "react";
  export const CameraView: React.ComponentType<Record<string, unknown>>;
  export function useCameraPermissions(): [
    { granted: boolean; canAskAgain: boolean } | null,
    () => Promise<{ granted: boolean; canAskAgain: boolean }>,
  ];
}

declare module "expo-sharing" {
  export function isAvailableAsync(): Promise<boolean>;
  export function shareAsync(url: string): Promise<void>;
}

declare module "expo-blur" {
  import type React from "react";
  export const BlurView: React.ComponentType<Record<string, unknown>>;
}

declare module "expo-image" {
  import type React from "react";
  export const Image: React.ComponentType<Record<string, unknown>>;
}

declare module "expo-local-authentication" {
  export function hasHardwareAsync(): Promise<boolean>;
  export function isEnrolledAsync(): Promise<boolean>;
  export function authenticateAsync(options?: Record<string, unknown>): Promise<{ success: boolean; error?: string }>;
}

declare module "expo-device" {
  export const isDevice: boolean;
}

declare module "react-native-gesture-handler" {
  import type React from "react";
  export const GestureHandlerRootView: React.ComponentType<Record<string, unknown>>;
}

declare module "react-native-safe-area-context" {
  import type React from "react";
  export const SafeAreaProvider: React.ComponentType<Record<string, unknown>>;
  export const SafeAreaView: React.ComponentType<Record<string, unknown>>;
  export function useSafeAreaInsets(): { top: number; right: number; bottom: number; left: number };
}

declare module "lucide-react-native" {
  import type React from "react";
  export type LucideIcon = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number; className?: string }>;
  export const AlertCircle: LucideIcon;
  export const ArrowLeft: LucideIcon;
  export const Bell: LucideIcon;
  export const Calendar: LucideIcon;
  export const Camera: LucideIcon;
  export const Check: LucideIcon;
  export const CheckCircle2: LucideIcon;
  export const ChevronRight: LucideIcon;
  export const Clipboard: LucideIcon;
  export const Clock: LucideIcon;
  export const Copy: LucideIcon;
  export const CreditCard: LucideIcon;
  export const Download: LucideIcon;
  export const Edit3: LucideIcon;
  export const Eye: LucideIcon;
  export const EyeOff: LucideIcon;
  export const ExternalLink: LucideIcon;
  export const FileText: LucideIcon;
  export const Filter: LucideIcon;
  export const Flame: LucideIcon;
  export const Globe: LucideIcon;
  export const HelpCircle: LucideIcon;
  export const Home: LucideIcon;
  export const KeyRound: LucideIcon;
  export const Link: LucideIcon;
  export const Lock: LucideIcon;
  export const LogOut: LucideIcon;
  export const Mail: LucideIcon;
  export const Menu: LucideIcon;
  export const MousePointerClick: LucideIcon;
  export const Pause: LucideIcon;
  export const Pencil: LucideIcon;
  export const Plus: LucideIcon;
  export const QrCode: LucideIcon;
  export const ScanLine: LucideIcon;
  export const Search: LucideIcon;
  export const Send: LucideIcon;
  export const Settings: LucideIcon;
  export const Share2: LucideIcon;
  export const Shield: LucideIcon;
  export const SlidersHorizontal: LucideIcon;
  export const Sparkles: LucideIcon;
  export const Target: LucideIcon;
  export const Trash2: LucideIcon;
  export const TrendingUp: LucideIcon;
  export const User: LucideIcon;
  export const WalletCards: LucideIcon;
  export const Wand2: LucideIcon;
  export const WifiOff: LucideIcon;
  export const X: LucideIcon;
  export const Zap: LucideIcon;
}

declare module "react-native-svg" {
  import type React from "react";
  export const Svg: React.ComponentType<Record<string, unknown>>;
  export const Path: React.ComponentType<Record<string, unknown>>;
  export const Rect: React.ComponentType<Record<string, unknown>>;
  export const Circle: React.ComponentType<Record<string, unknown>>;
  export const Line: React.ComponentType<Record<string, unknown>>;
  export const Defs: React.ComponentType<Record<string, unknown>>;
  export const LinearGradient: React.ComponentType<Record<string, unknown>>;
  export const Stop: React.ComponentType<Record<string, unknown>>;
}

declare module "@tanstack/react-query" {
  import type React from "react";

  export type QueryClientConfig = Record<string, unknown>;
  export class QueryClient {
    constructor(config?: QueryClientConfig);
    invalidateQueries: (options?: Record<string, unknown>) => Promise<void>;
  }
  export const QueryClientProvider: React.ComponentType<{ client: QueryClient; children: React.ReactNode }>;
  export function onlineManagerSetOnline(value: boolean): void;
  export const onlineManager: { setOnline: typeof onlineManagerSetOnline };
  export function useQuery<T>(options: Record<string, unknown>): {
    data: T | undefined;
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
    refetch: () => Promise<unknown>;
    isFetching: boolean;
  };
  export function useMutation<TData, TVariables>(options: Record<string, unknown>): {
    mutateAsync: (variables: TVariables) => Promise<TData>;
    isPending: boolean;
  };
}

declare module "@tanstack/query-async-storage-persister" {
  export function createAsyncStoragePersister(options: Record<string, unknown>): unknown;
}

declare module "@tanstack/react-query-persist-client" {
  export function persistQueryClient(options: Record<string, unknown>): void;
}

declare module "@react-native-async-storage/async-storage" {
  const AsyncStorage: {
    getItem: (key: string) => Promise<string | null>;
    setItem: (key: string, value: string) => Promise<void>;
    removeItem: (key: string) => Promise<void>;
  };
  export default AsyncStorage;
}

declare module "@react-native-community/netinfo" {
  export type NetInfoState = { isConnected: boolean | null; isInternetReachable: boolean | null };
  const NetInfo: {
    addEventListener: (listener: (state: NetInfoState) => void) => () => void;
    fetch: () => Promise<NetInfoState>;
  };
  export default NetInfo;
}

declare module "zustand" {
  export type UseBoundStore<T> = {
    (): T;
    <U>(selector: (state: T) => U): U;
  };
  export function create<T>(initializer: (set: (partial: Partial<T> | ((state: T) => Partial<T>)) => void, get: () => T) => T): UseBoundStore<T>;
}

declare module "zustand/middleware" {
  export type StateStorage = {
    getItem: (name: string) => string | Promise<string | null> | null;
    setItem: (name: string, value: string) => void | Promise<void>;
    removeItem: (name: string) => void | Promise<void>;
  };
  export function createJSONStorage(getStorage: () => StateStorage): StateStorage;
  export function persist<T>(initializer: (set: (partial: Partial<T> | ((state: T) => Partial<T>)) => void, get: () => T) => T, options: Record<string, unknown>): (set: (partial: Partial<T> | ((state: T) => Partial<T>)) => void, get: () => T) => T;
}
