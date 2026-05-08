import { useState } from "react";
import { Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { X, Zap } from "lucide-react-native";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Sheet } from "@/components/ui/Sheet";
import { isValidUrl } from "@/lib/utils/validation";

type QRScannerProps = {
  onClose: () => void;
  visible: boolean;
};

export function QRScanner({ onClose, visible }: QRScannerProps): JSX.Element | null {
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedUrl, setScannedUrl] = useState<string | null>(null);
  const [torch, setTorch] = useState(false);

  if (!visible) return null;

  if (!permission?.granted) {
    return (
      <View className="absolute inset-0 z-50 bg-surface px-5 pt-16">
        <Card className="gap-4" variant="glass">
          <Text className="text-h2 text-content-primary">Camera access</Text>
          <Text className="text-body text-content-secondary">Allow camera access to scan QR codes and create short links instantly.</Text>
          <Button accessibilityLabel="Allow camera access" onPress={() => void requestPermission()}>
            Allow Camera
          </Button>
          <Button accessibilityLabel="Close scanner" onPress={onClose} variant="ghost">
            Close
          </Button>
        </Card>
      </View>
    );
  }

  const handleScan = async (event: { data?: string }): Promise<void> => {
    const value = event.data ?? "";
    if (!value || scannedUrl) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setScannedUrl(value);
  };

  const createShortLink = (): void => {
    if (scannedUrl) {
      router.push(`/create?url=${encodeURIComponent(scannedUrl)}`);
      setScannedUrl(null);
      onClose();
    }
  };

  const openLinkSnapDetail = (): void => {
    const slug = scannedUrl?.split("/").filter(Boolean).at(-1);
    if (slug) router.push(`/link/${slug}`);
    setScannedUrl(null);
    onClose();
  };

  return (
    <View className="absolute inset-0 z-50 bg-surface">
      <CameraView className="flex-1" enableTorch={torch} onBarcodeScanned={handleScan}>
        <View className="flex-1 justify-between p-5 pt-16">
          <View className="flex-row justify-between">
            <Button accessibilityLabel="Close scanner" className="h-11 w-11" icon={X} onPress={onClose} variant="secondary">
              {""}
            </Button>
            <Button accessibilityLabel="Toggle flashlight" className="h-11 w-11" icon={Zap} onPress={() => setTorch((value) => !value)} variant="secondary">
              {""}
            </Button>
          </View>
          <View className="items-center">
            <View className="h-72 w-72 rounded-3xl border-4 border-accent" />
            <Text className="mt-5 text-body text-content-secondary">Align the QR code inside the gold frame.</Text>
          </View>
          <View />
        </View>
      </CameraView>
      <Sheet onClose={() => setScannedUrl(null)} title="Scanned URL" visible={Boolean(scannedUrl)}>
        <View className="gap-4">
          <Text className="text-body text-content-secondary">{scannedUrl}</Text>
          {scannedUrl?.includes("linksnap.id") ? (
            <Button accessibilityLabel="Open LinkSnap link" onPress={openLinkSnapDetail}>
              Open Link
            </Button>
          ) : null}
          <Button accessibilityLabel="Create short link from scanned URL" disabled={!isValidUrl(scannedUrl ?? "")} onPress={createShortLink} variant="secondary">
            Create Short Link
          </Button>
          {!isValidUrl(scannedUrl ?? "") ? <Text className="text-error">This QR code does not contain a supported URL.</Text> : null}
        </View>
      </Sheet>
    </View>
  );
}
