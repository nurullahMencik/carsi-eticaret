import { NextResponse } from "next/server";
import { getActor } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { can } from "@/lib/domain/roles";
import { renderInvoicePdf } from "@/lib/invoice";
import { isLocale } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const order = await db.order.findUnique({ where: { number }, include: { items: true } });
  // Owners and staff only; others get 404 so order numbers cannot be probed.
  if (!order || (order.userId !== actor.id && !can(actor.role, "order:read-all"))) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  if (!order.paidAt) return NextResponse.json({ error: "NOT_PAID" }, { status: 409 });
  const locale = await getLocale();
  const pdf = await renderInvoicePdf(order, isLocale(locale) ? locale : "tr");
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="fatura-${order.number}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
