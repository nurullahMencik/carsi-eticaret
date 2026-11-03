import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { activeProviderId } from "@/lib/payments";

export const dynamic = "force-dynamic";

/** Liveness + database check for Render's health check. */
export async function GET() {
  const started = Date.now();
  try {
    await db.$queryRawUnsafe("SELECT 1");
    const products = await db.product.count();
    return NextResponse.json(
      { status: "ok", database: "ok", products, paymentProvider: activeProviderId(), latencyMs: Date.now() - started, time: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[carsi] health check failed", error);
    return NextResponse.json({ status: "error", database: "unreachable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
