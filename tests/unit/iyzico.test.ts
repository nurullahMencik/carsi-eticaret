import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  buildInitializeBody,
  iyzicoAuthHeaders,
  iyzicoResponseSignature,
  IyzicoProvider,
  verifyCheckoutResult,
  type IyzicoCheckoutResult,
} from "@/lib/payments/iyzico";
import { activeProviderId } from "@/lib/payments";
import { demoCardOutcome, DemoProvider } from "@/lib/payments/demo";
import type { CheckoutRequest } from "@/lib/payments/types";

const SECRET = "sandbox-secret-key";
const config = { apiKey: "sandbox-api-key", secretKey: SECRET, baseUrl: "https://sandbox-api.iyzipay.com" };
const expected = { orderId: "ord_1", orderNumber: "CRS-261103-ABCD", total: 129000 };

/** A retrieve response as iyzico would send it, signed with the merchant secret. */
function signedResult(over: Partial<IyzicoCheckoutResult> = {}, secret = SECRET): IyzicoCheckoutResult {
  const r: IyzicoCheckoutResult = {
    status: "success",
    paymentStatus: "SUCCESS",
    paymentId: "28561234",
    currency: "TRY",
    basketId: expected.orderNumber,
    conversationId: expected.orderId,
    paidPrice: "1290.0",
    price: "1290.0",
    token: "tok_abc",
    fraudStatus: 1,
    ...over,
  };
  r.signature = iyzicoResponseSignature(
    [r.paymentStatus, r.paymentId, r.currency, r.basketId, r.conversationId, r.paidPrice, r.price, r.token],
    secret,
  );
  return r;
}

describe("iyzico response signature", () => {
  it("is HMAC-SHA256 (hex) of the ':'-joined fields", () => {
    const manual = createHmac("sha256", SECRET).update("SUCCESS:1:TRY:B:C:10.0:10.0:T").digest("hex");
    expect(iyzicoResponseSignature(["SUCCESS", 1, "TRY", "B", "C", "10.0", "10.0", "T"], SECRET)).toBe(manual);
  });
});

describe("verifyCheckoutResult (callback verification)", () => {
  it("accepts a correctly signed successful payment for the right order and amount", () => {
    expect(verifyCheckoutResult(signedResult(), expected, SECRET)).toEqual({ status: "success", providerRef: "28561234", amount: 129000, isDemo: false });
  });

  it("rejects a forged or tampered response (signature mismatch)", () => {
    expect(verifyCheckoutResult(signedResult({}, "attacker-secret"), expected, SECRET)).toMatchObject({ status: "failure", code: "SIGNATURE_MISMATCH" });
    const tampered = { ...signedResult(), paidPrice: "1.0" };
    expect(verifyCheckoutResult(tampered, expected, SECRET)).toMatchObject({ status: "failure", code: "SIGNATURE_MISMATCH" });
    expect(verifyCheckoutResult({ ...signedResult(), signature: undefined }, expected, SECRET)).toMatchObject({ code: "SIGNATURE_MISSING" });
  });

  it("rejects a validly signed payment whose amount does not match the order", () => {
    expect(verifyCheckoutResult(signedResult({ price: "1.0", paidPrice: "1.0" }), expected, SECRET)).toMatchObject({ status: "failure", code: "AMOUNT_MISMATCH" });
    expect(verifyCheckoutResult(signedResult({ paidPrice: "1200.0" }), expected, SECRET)).toMatchObject({ code: "AMOUNT_MISMATCH" });
  });

  it("allows paidPrice above price (installment interest) as long as price equals the order total", () => {
    expect(verifyCheckoutResult(signedResult({ paidPrice: "1335.15" }), expected, SECRET)).toMatchObject({ status: "success", amount: 129000 });
  });

  it("rejects payments for another order, other currencies, failures and fraud", () => {
    expect(verifyCheckoutResult(signedResult({ basketId: "CRS-OTHER" }), expected, SECRET)).toMatchObject({ code: "ORDER_MISMATCH" });
    expect(verifyCheckoutResult(signedResult({ conversationId: "ord_2" }), expected, SECRET)).toMatchObject({ code: "ORDER_MISMATCH" });
    expect(verifyCheckoutResult(signedResult({ currency: "USD" }), expected, SECRET)).toMatchObject({ code: "CURRENCY_MISMATCH" });
    expect(verifyCheckoutResult(signedResult({ paymentStatus: "FAILURE", errorCode: "10051", errorMessage: "Yetersiz bakiye" }), expected, SECRET)).toMatchObject({
      status: "failure",
      code: "10051",
    });
    expect(verifyCheckoutResult(signedResult({ fraudStatus: -1 }), expected, SECRET)).toMatchObject({ code: "FRAUD_REJECTED" });
    expect(verifyCheckoutResult({ status: "failure", errorCode: "5", errorMessage: "Geçersiz istek" }, expected, SECRET)).toMatchObject({ code: "5" });
  });
});

describe("IyzicoProvider with a mocked HTTP layer", () => {
  it("retrieves the result with an IYZWSv2-signed request and verifies it", async () => {
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) => new Response(JSON.stringify(signedResult()), { status: 200 }));
    const provider = new IyzicoProvider(config, fetchMock);
    const result = await provider.verifyCallback("tok_abc", expected);
    expect(result).toMatchObject({ status: "success", providerRef: "28561234" });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://sandbox-api.iyzipay.com/payment/iyzipos/checkoutform/auth/ecom/detail");
    const headers = init.headers as Record<string, string>;
    const rnd = headers["x-iyzi-rnd"]!;
    const decoded = Buffer.from(headers.Authorization!.replace("IYZWSv2 ", ""), "base64").toString();
    const sig = createHmac("sha256", SECRET)
      .update(rnd + "/payment/iyzipos/checkoutform/auth/ecom/detail" + String(init.body))
      .digest("hex");
    expect(decoded).toBe(`apiKey:${config.apiKey}&randomKey:${rnd}&signature:${sig}`);
    expect(JSON.parse(String(init.body))).toEqual({ locale: "tr", conversationId: "ord_1", token: "tok_abc" });
  });

  it("refuses a result that belongs to a different token", async () => {
    const provider = new IyzicoProvider(config, async () => new Response(JSON.stringify(signedResult({ token: "tok_other" }))));
    expect(await provider.verifyCallback("tok_abc", expected)).toMatchObject({ status: "failure", code: "TOKEN_MISMATCH" });
  });

  it("starts the checkout form and validates the initialize signature", async () => {
    const response = {
      status: "success",
      token: "tok_new",
      paymentPageUrl: "https://sandbox-cpp.iyzipay.com?token=tok_new",
      conversationId: "ord_1",
      signature: iyzicoResponseSignature(["ord_1", "tok_new"], SECRET),
    };
    const provider = new IyzicoProvider(config, async () => new Response(JSON.stringify(response)));
    expect(await provider.startCheckout(checkoutRequest())).toEqual({ kind: "redirect", url: response.paymentPageUrl, token: "tok_new" });

    const forged = new IyzicoProvider(config, async () => new Response(JSON.stringify({ ...response, signature: "00" })));
    expect(await forged.startCheckout(checkoutRequest())).toMatchObject({ kind: "error", code: "SIGNATURE_MISMATCH" });
  });

  it("produces the documented header layout", () => {
    const h = iyzicoAuthHeaders(config, "/x", { a: 1 }, "123");
    expect(h["x-iyzi-rnd"]).toBe("123");
    expect(h.Authorization.startsWith("IYZWSv2 ")).toBe(true);
  });
});

function checkoutRequest(): CheckoutRequest {
  return {
    orderId: "ord_1",
    orderNumber: expected.orderNumber,
    total: 129000,
    locale: "tr",
    buyer: { id: "u1", name: "Ayşe Yılmaz", email: "musteri@carsi.demo", phone: "05321234567", ip: "127.0.0.1" },
    address: { fullName: "Ayşe Yılmaz", city: "İstanbul", district: "Kadıköy", line: "Moda Cad. No: 42" },
    lines: [
      { id: "SER-001", name: "Kupa", category: "Seramik", amount: 90000 },
      { id: "TEK-001", name: "Peştemal", category: "Tekstil", amount: 39000 },
    ],
    callbackUrl: "http://localhost:5309/api/payments/iyzico/callback",
  };
}

describe("buildInitializeBody", () => {
  it("formats prices as decimal strings and requires the basket to add up", () => {
    const body = buildInitializeBody(checkoutRequest());
    expect(body.price).toBe("1290.00");
    expect(body.paidPrice).toBe("1290.00");
    expect(body.basketItems.map((b) => b.price)).toEqual(["900.00", "390.00"]);
    expect(body.buyer).toMatchObject({ name: "Ayşe", surname: "Yılmaz" });
    expect(() => buildInitializeBody({ ...checkoutRequest(), total: 1 })).toThrow(/does not add up/);
  });
});

describe("provider selection and demo cards", () => {
  it("uses iyzico only when both keys are present", () => {
    expect(activeProviderId({} as NodeJS.ProcessEnv)).toBe("DEMO");
    expect(activeProviderId({ IYZICO_API_KEY: "a" } as unknown as NodeJS.ProcessEnv)).toBe("DEMO");
    expect(activeProviderId({ IYZICO_API_KEY: "a", IYZICO_SECRET_KEY: "b" } as unknown as NodeJS.ProcessEnv)).toBe("IYZICO");
  });

  it("maps test cards to outcomes and declines anything else", () => {
    expect(demoCardOutcome("5528 7900 0000 0008")).toEqual({ result: "success" });
    expect(demoCardOutcome("4111111111111129")).toEqual({ result: "failure", code: "INSUFFICIENT_FUNDS" });
    expect(demoCardOutcome("4242424242424242")).toEqual({ result: "failure", code: "NOT_A_TEST_CARD" });
  });

  it("charges the server-side amount", () => {
    const result = new DemoProvider().charge("4766620000000001", 12345);
    expect(result).toMatchObject({ status: "success", amount: 12345, isDemo: true });
  });
});
