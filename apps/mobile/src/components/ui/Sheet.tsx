import type { ReactNode } from "react";
import { Modal, Text, View } from "react-native";
import { Button } from "./Button";

type SheetProps = {
  children: ReactNode;
  onClose: () => void;
  title: string;
  visible: boolean;
};

export function Sheet({ children, onClose, title, visible }: SheetProps): JSX.Element {
  return (
    <Modal animationType="fade" transparent visible={visible}>
      <View className="flex-1 justify-end bg-black/60">
        <View
          className="rounded-t-3xl border border-surface-300/50 bg-surface-100 p-5"
         
        >
          <View className="mb-5 flex-row items-center justify-between">
            <Text className="text-h3 text-content-primary">{title}</Text>
            <Button accessibilityLabel="Close sheet" className="h-11 px-4" onPress={onClose} variant="ghost">
              Close
            </Button>
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
}
