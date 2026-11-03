import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/env";
import { getIyzicoProvider } from "@/lib/payments";
import { confirmPayment, recordPaymentFailure, rejectCapturedPayment } from "@/lib/services/orders";

/**
 * iyzico posts `token` here after the hosted Checkout Form. The posted data is NOT trusted:
 * the result is fetched from iyzico with the token and verified (signature, status, order, amount).
 */
export async function POST(request: NextRequest) {
  const base = siteUrl();
  const form = await request.formData().catch(() => null);
  const token = String(form?.get("token") ?? "");
  if (!token || token.length > 200) return NextResponse.redirect(`${base}/hesabim`, 303);

  const order = await db.order.findUnique({ where: { paymentToken: token } });
  const iyzico = getIyzicoProvider();
  if (!order || !iyzico) return NextResponse.redirect(`${base}/hesabim`, 303);
  if (order.status !== "PENDING") return NextResponse.redirect(`${base}/odeme/${order.number}/tamamlandi`, 303);

  let verification;
  try {
    verification = await iyzico.verifyCallback(token, { orderId: order.id, orderNumber: order.number, total: order.total }, order.locale === "en" ? "en" : "tr");
  } catch (error) {
    console.error("[carsi] iyzico verification failed", error);
    verification = { status: "failure" as const, code: "IYZICO_UNREACHABLE", message: "Verification request failed" };
  }
  if (verification.status === "failure") {
    await recordPaymentFailure(order.id, "IYZICO", order.total, verification.code, verification.message);
    return NextResponse.redirect(`${base}/odeme/${order.number}?hata=${encodeURIComponent(verification.code)}`, 303);
  }
  const result = await confirmPayment(order.id, { ...verification, provider: "IYZICO" });
  if (result.status === "rejected") {
    if (result.code === "OUT_OF_STOCK") {
      const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
      await rejectCapturedPayment(order.id, { provider: "IYZICO", providerRef: verification.providerRef, amount: verification.amount }, "OUT_OF_STOCK", ip);
    }
    return NextResponse.redirect(`${base}/odeme/${order.number}?hata=${result.code}`, 303);
  }
  return NextResponse.redirect(`${base}/odeme/${order.number}/tamamlandi`, 303);
}
