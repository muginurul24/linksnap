export const PAYGATE_BANK_CODES = [
  "bca",
  "bni",
  "bri",
  "mandiri",
  "permata",
  "cimb",
  "danamon",
] as const;

export const PAYGATE_EWALLET_CODES = [
  "gopay",
  "ovo",
  "dana",
  "shopeepay",
  "linkaja",
] as const;

export const PAYGATE_CSTORE_CODES = ["indomaret", "alfamart"] as const;

export type BankCode = (typeof PAYGATE_BANK_CODES)[number];
export type EwalletCode = (typeof PAYGATE_EWALLET_CODES)[number];
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
  | "qris";

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
  paymentMethod: "qris";
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
