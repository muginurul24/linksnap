import {
  PAYGATE_BANK_CODES,
  PAYGATE_CSTORE_CODES,
  PAYGATE_EWALLET_CODES,
  type BankCode,
  type CstoreCode,
  type EwalletCode,
  type PayGatePaymentType,
  type PaymentChannelCode,
} from "@/lib/payments/payment-channel-codes";

export type PaymentChannelCategory =
  | "bank_transfer"
  | "convenience_store"
  | "ewallet"
  | "qris";

export type PaymentChannelIcon =
  | "building-2"
  | "qr-code"
  | "smartphone"
  | "store";

export type PaymentChannel = {
  category: PaymentChannelCategory;
  categoryLabel: string;
  description: string;
  enabled: boolean;
  estimatedProcessingTime: string;
  icon: PaymentChannelIcon;
  id: PaymentChannelCode;
  instructions: string;
  name: string;
  paymentType: PayGatePaymentType;
  priority: number;
  shortName: string;
};

export type PaymentChannelCategoryColors = {
  badgeClassName: string;
  borderClassName: string;
  selectedClassName: string;
  textClassName: string;
};

export const PAYMENT_CHANNEL_CATEGORY_COLORS: Record<
  PaymentChannelCategory,
  PaymentChannelCategoryColors
> = {
  bank_transfer: {
    badgeClassName: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
    borderClassName: "border-blue-200 dark:border-blue-900",
    selectedClassName: "border-blue-500 bg-blue-50 dark:bg-blue-950/40",
    textClassName: "text-blue-700 dark:text-blue-300",
  },
  convenience_store: {
    badgeClassName: "bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300",
    borderClassName: "border-orange-200 dark:border-orange-900",
    selectedClassName: "border-orange-500 bg-orange-50 dark:bg-orange-950/40",
    textClassName: "text-orange-700 dark:text-orange-300",
  },
  ewallet: {
    badgeClassName: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    borderClassName: "border-emerald-200 dark:border-emerald-900",
    selectedClassName: "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40",
    textClassName: "text-emerald-700 dark:text-emerald-300",
  },
  qris: {
    badgeClassName: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
    borderClassName: "border-violet-200 dark:border-violet-900",
    selectedClassName: "border-violet-500 bg-violet-50 dark:bg-violet-950/40",
    textClassName: "text-violet-700 dark:text-violet-300",
  },
};

const BANK_NAMES: Record<BankCode, { name: string; shortName: string }> = {
  bca: { name: "BCA Virtual Account", shortName: "BCA" },
  bni: { name: "BNI Virtual Account", shortName: "BNI" },
  bri: { name: "BRI Virtual Account", shortName: "BRI" },
  cimb: { name: "CIMB Niaga Virtual Account", shortName: "CIMB Niaga" },
  danamon: { name: "Danamon Virtual Account", shortName: "Danamon" },
  mandiri: { name: "Mandiri Virtual Account", shortName: "Mandiri" },
  permata: { name: "Permata Virtual Account", shortName: "Permata" },
};

const EWALLET_NAMES: Record<EwalletCode, { name: string; shortName: string }> = {
  dana: { name: "DANA", shortName: "DANA" },
  gopay: { name: "GoPay", shortName: "GoPay" },
  linkaja: { name: "LinkAja", shortName: "LinkAja" },
  ovo: { name: "OVO", shortName: "OVO" },
  shopeepay: { name: "ShopeePay", shortName: "ShopeePay" },
};

const CSTORE_NAMES: Record<CstoreCode, { name: string; shortName: string }> = {
  alfamart: { name: "Alfamart", shortName: "Alfamart" },
  indomaret: { name: "Indomaret", shortName: "Indomaret" },
};

export const BANK_CHANNELS: readonly PaymentChannel[] = PAYGATE_BANK_CODES.map(
  (id, index) => ({
    category: "bank_transfer",
    categoryLabel: "Bank Transfer",
    description: "Transfer via ATM, mobile banking, or internet banking.",
    enabled: true,
    estimatedProcessingTime: "1-2 hours",
    icon: "building-2",
    id,
    instructions: "Copy the virtual account number and complete your transfer before it expires.",
    name: BANK_NAMES[id].name,
    paymentType: "bank_transfer",
    priority: index + 1,
    shortName: BANK_NAMES[id].shortName,
  }),
);

export const EWALLET_CHANNELS: readonly PaymentChannel[] =
  PAYGATE_EWALLET_CODES.map((id, index) => ({
    category: "ewallet",
    categoryLabel: "E-Wallet",
    description: "Complete the payment from your wallet app.",
    enabled: true,
    estimatedProcessingTime: "Instant",
    icon: "smartphone",
    id,
    instructions: `Open ${EWALLET_NAMES[id].shortName}, confirm the payment, then return to LinkSnap.`,
    name: EWALLET_NAMES[id].name,
    paymentType: "ewallet",
    priority: 100 + index + 1,
    shortName: EWALLET_NAMES[id].shortName,
  }));

export const QRIS_CHANNEL: PaymentChannel = {
  category: "qris",
  categoryLabel: "QRIS",
  description: "Scan with any QRIS-supported bank or wallet app.",
  enabled: true,
  estimatedProcessingTime: "Instant",
  icon: "qr-code",
  id: "qris",
  instructions: "Scan the QR code with any QRIS-supported app and pay the exact amount.",
  name: "QRIS",
  paymentType: "qris",
  priority: 200,
  shortName: "QRIS",
};

export const CSTORE_CHANNELS: readonly PaymentChannel[] =
  PAYGATE_CSTORE_CODES.map((id, index) => ({
    category: "convenience_store",
    categoryLabel: "Convenience Store",
    description: `Pay at the nearest ${CSTORE_NAMES[id].shortName} cashier.`,
    enabled: true,
    estimatedProcessingTime: "Up to 1 hour",
    icon: "store",
    id,
    instructions: `Show the payment code to the ${CSTORE_NAMES[id].shortName} cashier before it expires.`,
    name: CSTORE_NAMES[id].name,
    paymentType: "cstore",
    priority: 300 + index + 1,
    shortName: CSTORE_NAMES[id].shortName,
  }));

export const ALL_PAYMENT_CHANNELS: readonly PaymentChannel[] = [
  ...BANK_CHANNELS,
  ...EWALLET_CHANNELS,
  QRIS_CHANNEL,
  ...CSTORE_CHANNELS,
].sort((a, b) => a.priority - b.priority);

export const CHANNELS_BY_CATEGORY: Record<
  PaymentChannelCategory,
  readonly PaymentChannel[]
> = {
  bank_transfer: BANK_CHANNELS,
  convenience_store: CSTORE_CHANNELS,
  ewallet: EWALLET_CHANNELS,
  qris: [QRIS_CHANNEL],
};

export function getChannelById(id: string): PaymentChannel | undefined {
  return ALL_PAYMENT_CHANNELS.find((channel) => channel.id === id);
}

export function isPaymentChannelId(id: string): id is PaymentChannelCode {
  return getChannelById(id) !== undefined;
}

export function getChannelIcon(id: string): PaymentChannelIcon | undefined {
  return getChannelById(id)?.icon;
}

export function getPaymentInstructions(
  channelOrId: PaymentChannel | string,
): string | undefined {
  const channel =
    typeof channelOrId === "string" ? getChannelById(channelOrId) : channelOrId;

  return channel?.instructions;
}

export function getChannelCategoryColors(
  category: PaymentChannelCategory,
): PaymentChannelCategoryColors {
  return PAYMENT_CHANNEL_CATEGORY_COLORS[category];
}
