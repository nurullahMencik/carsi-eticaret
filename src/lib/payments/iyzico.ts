import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { decimalStringToKurus, kurusToDecimalString } from "@/lib/domain/money";
import type {
  CheckoutRequest,
  ExpectedPayment,
  PaymentProvider,
  PaymentVerification,
  RefundResult,
  StartCheckoutResult,
} from "./types";

export type IyzicoConfig = {
  apiKey: string;
  secretKey: string;
  baseUrl: string;
};

export const IYZICO_SANDBOX_URL = "https://sandbox-api.iyzipay.com";

const PATHS = {
  initialize: "/payment/iyzipos/checkoutform/initialize/auth/ecom",
  retrieve: "/payment/iyzipos/checkoutform/auth/ecom/detail",
  cancel: "/payment/cancel",
} as const;

type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

/** HMAC-SHA256 (hex) of the given values joined with ":" — iyzico's response signature scheme. */
export function iyzicoResponseSignature(values: Array<string | number | null | undefined>, secretKey: string): string {
  const data = values.map((v) => (v === null || v === undefined ? "" : String(v))).join(":");
  return createHmac("sha256", secretKey).update(data, "utf8").digest("hex");
}

function safeEqualHex(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** IYZWSv2 authorization header: HMAC-SHA256(secret, randomKey + uriPath + body). */
export function iyzicoAuthHeaders(config: IyzicoConfig, uriPath: string, body: unknown, randomKey?: string) {
  const rnd = randomKey ?? `${Date.now()}${randomBytes(8).toString("hex")}`;
  const payload = rnd + uriPath + JSON.stringify(body);
  const signature = createHmac("sha256", config.secretKey).update(payload, "utf8").digest("hex");
  const auth = `apiKey:${config.apiKey}&randomKey:${rnd}&signature:${signature}`;
  return {
    Authorization: `IYZWSv2 ${Buffer.from(auth, "utf8").toString("base64")}`,
    "x-iyzi-rnd": rnd,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

/** Shape of the checkout form "retrieve" response fields we rely on. */
export type IyzicoCheckoutResult = {
  status?: string;
  errorCode?: string;
  errorMessage?: string;
  paymentStatus?: string;
  paymentId?: string;
  price?: number | string;
  paidPrice?: number | string;
  currency?: string;
  basketId?: string;
  conversationId?: string;
  token?: string;
  signature?: string;
  fraudStatus?: number;
};

/**
 * Verifies a checkout form result *on the server*. Never trust what the browser posts:
 * the callback only gives us a token; the result is fetched from iyzico and checked for
 *  1. API status, 2. HMAC signature, 3. payment status, 4. order identity, 5. currency and amount.
 */
export function verifyCheckoutResult(
  result: IyzicoCheckoutResult,
  expected: ExpectedPayment,
  secretKey: string,
): PaymentVerification {
  if (result.status !== "success") {
    return { status: "failure", code: result.errorCode ?? "IYZICO_ERROR", message: result.errorMessage ?? "Payment failed" };
  }
  if (!result.signature) return { status: "failure", code: "SIGNATURE_MISSING", message: "Response signature missing" };
  const calculated = iyzicoResponseSignature(
    [
      result.paymentStatus,
      result.paymentId,
      result.currency,
      result.basketId,
      result.conversationId,
      result.paidPrice,
      result.price,
      result.token,
    ],
    secretKey,
  );
  if (!safeEqualHex(calculated, result.signature)) {
    return { status: "failure", code: "SIGNATURE_MISMATCH", message: "Response signature mismatch" };
  }
  if (result.paymentStatus !== "SUCCESS") {
    return {
      status: "failure",
      code: result.errorCode ?? `PAYMENT_${result.paymentStatus ?? "UNKNOWN"}`,
      message: result.errorMessage ?? "Payment not completed",
    };
  }
  if (result.fraudStatus === -1) return { status: "failure", code: "FRAUD_REJECTED", message: "Rejected by fraud check" };
  if (result.basketId !== expected.orderNumber || result.conversationId !== expected.orderId) {
    return { status: "failure", code: "ORDER_MISMATCH", message: "Payment belongs to another order" };
  }
  if (result.currency !== "TRY") return { status: "failure", code: "CURRENCY_MISMATCH", message: "Unexpected currency" };
  const price = decimalStringToKurus(result.price ?? "");
  const paid = decimalStringToKurus(result.paidPrice ?? "");
  // `price` must equal the order total; `paidPrice` may be higher only because of installment interest.
  if (price !== expected.total || !(paid >= expected.total)) {
    return { status: "failure", code: "AMOUNT_MISMATCH", message: `Expected ${expected.total}, got price=${price} paid=${paid}` };
  }
  if (!result.paymentId) return { status: "failure", code: "PAYMENT_ID_MISSING", message: "Payment id missing" };
  return { status: "success", providerRef: result.paymentId, amount: price, isDemo: false };
}

function splitName(fullName: string): { name: string; surname: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { name: parts[0]!, surname: parts[0]! };
  return { name: parts.slice(0, -1).join(" "), surname: parts.at(-1)! };
}

/** Builds the Checkout Form initialize request. Basket item prices must add up to `price`. */
export function buildInitializeBody(req: CheckoutRequest) {
  const { name, surname } = splitName(req.address.fullName || req.buyer.name);
  const address = {
    contactName: req.address.fullName,
    city: req.address.city,
    country: "Turkey",
    address: `${req.address.line} ${req.address.district}/${req.address.city}`,
    zipCode: req.address.postalCode || undefined,
  };
  const basketItems = req.lines
    .filter((l) => l.amount > 0)
    .map((l) => ({
      id: l.id,
      name: l.name.slice(0, 100),
      category1: l.category,
      itemType: "PHYSICAL",
      price: kurusToDecimalString(l.amount),
    }));
  const sum = req.lines.reduce((a, l) => a + l.amount, 0);
  if (sum !== req.total) throw new Error(`Basket (${sum}) does not add up to the order total (${req.total})`);
  return {
    locale: req.locale,
    conversationId: req.orderId,
    price: kurusToDecimalString(req.total),
    paidPrice: kurusToDecimalString(req.total),
    currency: "TRY",
    basketId: req.orderNumber,
    paymentGroup: "PRODUCT",
    callbackUrl: req.callbackUrl,
    enabledInstallments: [1, 2, 3, 6],
    buyer: {
      id: req.buyer.id,
      name,
      surname,
      gsmNumber: req.buyer.phone,
      email: req.buyer.email,
      // iyzico requires a national ID; a placeholder is accepted for sandbox/non-invoice flows.
      identityNumber: "11111111111",
      registrationAddress: address.address,
      ip: req.buyer.ip,
      city: address.city,
      country: address.country,
      zipCode: address.zipCode,
    },
    shippingAddress: address,
    billingAddress: address,
    basketItems,
  };
}

export class IyzicoProvider implements PaymentProvider {
  readonly id = "IYZICO" as const;

  constructor(
    private readonly config: IyzicoConfig,
    private readonly fetchImpl: FetchLike = (input, init) => fetch(input, init),
  ) {}

  private async post<T>(path: string, body: unknown): Promise<T> {
    const response = await this.fetchImpl(this.config.baseUrl + path, {
      method: "POST",
      headers: iyzicoAuthHeaders(this.config, path, body),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error(`iyzico HTTP ${response.status}`);
    return (await response.json()) as T;
  }

  async startCheckout(request: CheckoutRequest): Promise<StartCheckoutResult> {
    const body = buildInitializeBody(request);
    const res = await this.post<{
      status?: string;
      errorCode?: string;
      errorMessage?: string;
      token?: string;
      paymentPageUrl?: string;
      conversationId?: string;
      signature?: string;
    }>(PATHS.initialize, body);
    if (res.status !== "success" || !res.token || !res.paymentPageUrl) {
      return { kind: "error", code: res.errorCode ?? "IYZICO_INIT_FAILED", message: res.errorMessage ?? "Checkout could not be started" };
    }
    if (res.signature) {
      const expected = iyzicoResponseSignature([res.conversationId, res.token], this.config.secretKey);
      if (!safeEqualHex(expected, res.signature)) {
        return { kind: "error", code: "SIGNATURE_MISMATCH", message: "Initialize response signature mismatch" };
      }
    }
    return { kind: "redirect", url: res.paymentPageUrl, token: res.token };
  }

  /** Fetches the result for a callback token and verifies it against the order. */
  async verifyCallback(token: string, expected: ExpectedPayment, locale: "tr" | "en" = "tr"): Promise<PaymentVerification> {
    const result = await this.post<IyzicoCheckoutResult>(PATHS.retrieve, {
      locale,
      conversationId: expected.orderId,
      token,
    });
    if (result.token !== undefined && result.token !== token) {
      return { status: "failure", code: "TOKEN_MISMATCH", message: "Token mismatch" };
    }
    return verifyCheckoutResult(result, expected, this.config.secretKey);
  }

  async refund(input: { orderId: string; providerRef: string; amount: number; ip: string }): Promise<RefundResult> {
    // Full cancellation. (Partial refunds would use /payment/refund per paymentTransactionId.)
    const res = await this.post<{ status?: string; errorCode?: string; errorMessage?: string; paymentId?: string }>(PATHS.cancel, {
      locale: "tr",
      conversationId: input.orderId,
      paymentId: input.providerRef,
      ip: input.ip,
    });
    if (res.status !== "success") {
      return { ok: false, code: res.errorCode ?? "IYZICO_REFUND_FAILED", message: res.errorMessage ?? "Refund failed" };
    }
    return { ok: true, reference: res.paymentId };
  }
}
