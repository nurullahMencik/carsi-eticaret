import { randomBytes } from "node:crypto";
import { digitsOnly } from "@/lib/domain/card";
import type { CheckoutRequest, PaymentProvider, PaymentVerification, RefundResult, StartCheckoutResult } from "./types";

export type DemoCardOutcome = { result: "success" } | { result: "failure"; code: string };

/**
 * Test cards accepted by the demo provider. Any other number is declined, so a real
 * card can never be "charged" by mistake.
 */
export const DEMO_TEST_CARDS: Array<{ number: string; brand: string; outcome: DemoCardOutcome }> = [
  { number: "5528790000000008", brand: "Mastercard", outcome: { result: "success" } },
  { number: "4766620000000001", brand: "Visa", outcome: { result: "success" } },
  { number: "4111111111111129", brand: "Visa", outcome: { result: "failure", code: "INSUFFICIENT_FUNDS" } },
  { number: "4129111111111111", brand: "Visa", outcome: { result: "failure", code: "DO_NOT_HONOUR" } },
  { number: "4124111111111116", brand: "Visa", outcome: { result: "failure", code: "INVALID_CVC" } },
];

export function demoCardOutcome(cardNumber: string): DemoCardOutcome {
  const digits = digitsOnly(cardNumber);
  return DEMO_TEST_CARDS.find((c) => c.number === digits)?.outcome ?? { result: "failure", code: "NOT_A_TEST_CARD" };
}

export class DemoProvider implements PaymentProvider {
  readonly id = "DEMO" as const;

  async startCheckout(request: CheckoutRequest): Promise<StartCheckoutResult> {
    return { kind: "redirect", url: `/odeme/${encodeURIComponent(request.orderNumber)}` };
  }

  /** "Charges" a test card. The amount is whatever the server computed for the order. */
  charge(cardNumber: string, amount: number): PaymentVerification {
    const outcome = demoCardOutcome(cardNumber);
    if (outcome.result === "failure") return { status: "failure", code: outcome.code, message: outcome.code };
    return { status: "success", providerRef: `demo_${randomBytes(9).toString("base64url")}`, amount, isDemo: true };
  }

  async refund(): Promise<RefundResult> {
    return { ok: true, reference: `demo_refund_${randomBytes(6).toString("hex")}` };
  }
}
