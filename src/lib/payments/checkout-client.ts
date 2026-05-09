export type PaymentCreateResponseData = {
  orderId: string;
  paymentMethod?: string;
  paymentType?: string;
  redirectUrl?: string;
  snapToken?: string;
  status?: string;
  transactionId?: string;
};

export function getPaymentCreateEndpoint(): string {
  return "/api/v1/payments/create";
}

export function getPaymentRedirectUrl(
  data: PaymentCreateResponseData,
): string | null {
  return data.redirectUrl ?? null;
}
