import { View } from "react-native";
import { Rect, Svg } from "react-native-svg";

type QRCodeProps = {
  value: string;
  size?: number;
};

export function QRCode({ size = 220, value }: QRCodeProps): JSX.Element {
  const seed = value.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const cells = Array.from({ length: 21 * 21 }, (_, index) => {
    const x = index % 21;
    const y = Math.floor(index / 21);
    const finder =
      (x < 7 && y < 7) ||
      (x > 13 && y < 7) ||
      (x < 7 && y > 13);
    return finder || ((x * 17 + y * 31 + seed) % 5 === 0);
  });

  return (
    <View accessibilityLabel={`QR code for ${value}`} className="items-center justify-center rounded-2xl bg-content-primary p-4">
      <Svg height={size} viewBox="0 0 21 21" width={size}>
        <Rect fill="#FAFAFA" height="21" width="21" x="0" y="0" />
        {cells.map((filled, index) =>
          filled ? <Rect fill="#09090B" height="1" key={`${value}-${index}`} width="1" x={index % 21} y={Math.floor(index / 21)} /> : null,
        )}
      </Svg>
    </View>
  );
}
