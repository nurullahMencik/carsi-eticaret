import type { Metadata } from "next";
import { AddressBook } from "@/components/store/address-book";
import { db } from "@/lib/db";
import { requireActor } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.account.addresses, robots: { index: false } };
}

export default async function AddressesPage() {
  const actor = await requireActor("/hesabim/adresler");
  const { dict } = await getI18n();
  const [addresses, user] = await Promise.all([
    db.address.findMany({ where: { userId: actor.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] }),
    db.user.findUniqueOrThrow({ where: { id: actor.id }, select: { name: true } }),
  ]);
  return (
    <section aria-labelledby="addresses-title">
      <h2 id="addresses-title" className="mb-5 font-display text-2xl">
        {dict.account.addresses}
      </h2>
      <AddressBook addresses={addresses} defaultName={user.name} />
    </section>
  );
}
