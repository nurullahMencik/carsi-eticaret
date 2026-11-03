import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { CheckoutSteps } from "@/components/store/checkout-steps";
import { ButtonLink } from "@/components/ui/button";
import { db } from "@/lib/db";
import { requireActor } from "@/lib/auth/session";
import { formatTRY } from "@/lib/domain/money";
import { fmt } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.checkout.successTitle, robots: { index: false } };
}

export default async function PaymentDonePage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const actor = await requireActor(`/odeme/${number}/tamamlandi`);
  const { dict, locale } = await getI18n();
  const order = await db.order.findUnique({ where: { number }, include: { items: true } });
  if (!order || order.userId !== actor.id) notFound();
  if (order.status === "PENDING") redirect(`/odeme/${number}`);
  return (
    <div className="container-page max-w-2xl pt-10">
      <CheckoutSteps current="done" dict={dict} />
      <div className="mt-10 rounded-[1.75rem] border border-line bg-surface p-8 text-center sm:p-12">
        <CheckCircle2 aria-hidden className="mx-auto size-14 text-success" strokeWidth={1.5} />
        <h1 className="mt-4 font-display text-4xl" data-testid="success-title">
          {dict.checkout.successTitle}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-ink-2">{fmt(dict.checkout.successText, { number: order.number, email: order.email })}</p>
        <ul className="mx-auto mt-8 max-w-sm space-y-1.5 text-left text-sm">
          {order.items.map((i) => (
            <li key={i.id} className="flex justify-between gap-3">
              <span className="text-ink-2">
                {i.quantity} × {locale === "en" ? i.productNameEn : i.productNameTr}
              </span>
              <span className="num">{formatTRY(i.lineTotal)}</span>
            </li>
          ))}
          <li className="flex justify-between gap-3 border-t border-line pt-2 font-semibold">
            <span>{dict.cart.total}</span>
            <span className="num">{formatTRY(order.total)}</span>
          </li>
        </ul>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href={`/hesabim/siparisler/${order.number}`}>{dict.checkout.viewOrder}</ButtonLink>
          <ButtonLink href="/urunler" variant="outline">
            {dict.cart.continueShopping}
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
