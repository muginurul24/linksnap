export const PAYGATE_BANK_CODES = [
  "bni",
  "bri",
  "bsi",
  "mandiri",
  "permata",
  "cimb",
] as const;

export const PAYGATE_EWALLET_CODES = ["gopay"] as const;
export const PAYGATE_QRIS_CODES = ["qris_gopay"] as const;

export const PAYGATE_CSTORE_CODES = [] as const;

export type BankCode = (typeof PAYGATE_BANK_CODES)[number];
export type EwalletCode = (typeof PAYGATE_EWALLET_CODES)[number];
export type QrisCode = (typeof PAYGATE_QRIS_CODES)[number];
export type CstoreCode = (typeof PAYGATE_CSTORE_CODES)[number];

export type PayGatePaymentType =
  | "bank_transfer"
  | "cstore"
  | "ewallet"
  | "qris";

export type PaymentChannelCode =
  | BankCode
  | CstoreCode
  | EwalletCode
  | QrisCode;

export type BankTransfer = {
  bank: BankCode;
  paymentMethod: BankCode;
  paymentType: "bank_transfer";
};

export type Ewallet = {
  ewallet: EwalletCode;
  paymentMethod: EwalletCode;
  paymentType: "ewallet";
};

export type Qris = {
  acquirer: "gopay";
  paymentMethod: QrisCode;
  paymentType: "qris";
};

export type ConvenienceStore = {
  paymentMethod: CstoreCode;
  paymentType: "cstore";
  store: CstoreCode;
};

export type PayGateResolvedPaymentChannel =
  | BankTransfer
  | ConvenienceStore
  | Ewallet
  | Qris;
