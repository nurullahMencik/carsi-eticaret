/**
 * Payment provider abstraction. Two implementations:
 *  - "IYZICO": hosted Checkout Form (redirect + server-side callback verification)
 *  - "DEMO":   on-site test card form, no real money; used when iyzico keys are absent.
 */
export const PAYMENT_PROVIDER_IDS = ["DEMO", "IYZICO"] as const;
export type PaymentProviderId = (typeof PAYMENT_PROVIDER_IDS)[number];

export type CheckoutBuyer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  ip: string;
};

export type CheckoutAddress = {
  fullName: string;
  city: string;
  district: string;
  line: string;
  postalCode?: string | null;
};

export type CheckoutLine = {
  id: string;
  name: string;
  category: string;
  /** Total for the line after its share of the discount, kuruş. */
  amount: number;
};

export type CheckoutRequest = {
  orderId: string;
  orderNumber: string;
  /** Amount to charge, kuruş (VAT and shipping included, discounts applied). */
  total: number;
  locale: "tr" | "en";
  buyer: CheckoutBuyer;
  address: CheckoutAddress;
  lines: CheckoutLine[];
  callbackUrl: string;
};

export type StartCheckoutResult =
  | { kind: "redirect"; url: string; token?: string }
  | { kind: "error"; code: string; message: string };

/** What a provider tells us after verifying a payment on the server. */
export type PaymentVerification =
  | { status: "success"; providerRef: string; amount: number; isDemo: boolean }
  | { status: "failure"; code: string; message: string };

export type ExpectedPayment = {
  orderId: string;
  orderNumber: string;
  total: number;
};

export type RefundResult = { ok: true; reference?: string } | { ok: false; code: string; message: string };

export interface PaymentProvider {
  readonly id: PaymentProviderId;
  /** Prepares the payment and tells the caller where to send the customer. */
  startCheckout(request: CheckoutRequest): Promise<StartCheckoutResult>;
  /** Cancels/refunds a captured payment in full. */
  refund(input: { orderId: string; providerRef: string; amount: number; ip: string }): Promise<RefundResult>;
}
