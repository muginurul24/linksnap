import { useState } from "react";
import { Linking, Share, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Copy, Edit3, ExternalLink, QrCode, Share2, Trash2 } from "lucide-react-native";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { QRCode } from "@/components/ui/QRCode";
import { Screen } from "@/components/ui/Screen";
import { Sheet } from "@/components/ui/Sheet";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatsCard } from "@/components/ui/StatsCard";
import { colors } from "@/lib/constants/theme";
import { useLink } from "@/lib/hooks/useLinks";

export default function LinkDetailScreen(): JSX.Element {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const link = useLink(id);
  const item = link.data;
  const shortUrl = item?.shortUrl ?? `https://linksnap.id/${item?.slug ?? id ?? ""}`;

  const copy = async (): Promise<void> => {
    await Clipboard.setStringAsync(shortUrl);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <Screen>
      <View className="flex-row items-center justify-between">
        <Button accessibilityLabel="Back" className="h-11 w-11" icon={ArrowLeft} onPress={() => router.back()} variant="secondary">
          {""}
        </Button>
        <Text className="text-h2 text-content-primary">Link Details</Text>
        <Button accessibilityLabel="Edit link" className="h-11 w-11" icon={Edit3} onPress={() => router.push(`/link/${id}/edit`)} variant="secondary">
          {""}
        </Button>
      </View>

      {link.isLoading ? (
        <Skeleton variant="detail" />
      ) : link.isError || !item ? (
        <ErrorState message="Link details could not be loaded." onRetry={() => void link.refetch()} />
      ) : (
        <>
          <Card className="items-center gap-4 py-8" variant="glass">
            <Text className="text-center text-h1 text-content-primary">linksnap.id/{item.slug}</Text>
            <View className="flex-row gap-3">
              <Button accessibilityLabel="Copy short URL" icon={Copy} onPress={copy} variant="secondary">
                Copy
              </Button>
              <Button accessibilityLabel="Share short URL" icon={Share2} onPress={async () => {
                await Share.share({ message: shortUrl });
              }}>
                Share
              </Button>
            </View>
          </Card>
          <View className="flex-row gap-3">
            <StatsCard label="Total Clicks" value={item.clickCount} />
            <StatsCard accentColor={colors.semantic.success} label="Today" value={item.clicksToday} />
            <StatsCard accentColor={colors.semantic.info} label="Unique" value={item.uniqueVisitors ?? 0} />
          </View>
          <Card className="gap-2" variant="glass">
            <Text className="text-caption text-content-tertiary">Destination</Text>
            <Text className="text-body-lg text-content-primary" numberOfLines={2}>
              {item.destinationUrl}
            </Text>
          </Card>
          <View className="flex-row flex-wrap gap-3">
            <Button accessibilityLabel="Show QR code" className="min-w-[47%] flex-1" icon={QrCode} onPress={() => setQrOpen(true)} variant="secondary">
              QR Code
            </Button>
            <Button accessibilityLabel="Open analytics" className="min-w-[47%] flex-1" onPress={() => router.push(`/link/${id}/analytics`)} variant="secondary">
              Analytics
            </Button>
            <Button accessibilityLabel="Open destination" className="min-w-[47%] flex-1" icon={ExternalLink} onPress={() => Linking.openURL(item.destinationUrl)} variant="secondary">
              Open
            </Button>
            <Button accessibilityLabel="Delete link" className="min-w-[47%] flex-1" icon={Trash2} onPress={() => setDeleteOpen(true)} variant="danger">
              Delete
            </Button>
          </View>
          {item.hasLinkPage ? (
            <Card className="gap-2" variant="accent">
              <Text className="text-h3 text-accent">Link Page Enabled</Text>
              <Text className="text-body text-content-secondary">Preview, CTA, QR, and countdown analytics are active.</Text>
              <Badge tone="accent">Live</Badge>
            </Card>
          ) : null}
          <Card className="gap-2" variant="glass">
            <Text className="text-h3 text-content-primary">Smart Rules</Text>
            <Text className="text-body text-content-secondary">No active rules yet. Add geo, device, time, or language routing from edit.</Text>
          </Card>
        </>
      )}

      <Sheet onClose={() => setQrOpen(false)} title="QR Code" visible={qrOpen}>
        <View className="items-center gap-4">
          <QRCode value={shortUrl} />
          <Button accessibilityLabel="Share QR link" icon={Share2} onPress={async () => {
            await Share.share({ message: shortUrl });
          }}>
            Share Link
          </Button>
        </View>
      </Sheet>
      <Sheet onClose={() => setDeleteOpen(false)} title="Delete Link" visible={deleteOpen}>
        <View className="gap-4">
          <Text className="text-body text-content-secondary">Deleting this link stops redirects and removes it from campaigns.</Text>
          <Button accessibilityLabel="Cancel delete" onPress={() => setDeleteOpen(false)} variant="secondary">
            Cancel
          </Button>
          <Button accessibilityLabel="Confirm delete link" icon={Trash2} onPress={() => setDeleteOpen(false)} variant="danger">
            Delete Link
          </Button>
        </View>
      </Sheet>
    </Screen>
  );
}
