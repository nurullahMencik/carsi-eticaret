"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MapPin, Plus, Star, Trash2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/field";
import { deleteAddressAction, saveAddressAction, setDefaultAddressAction } from "@/lib/actions/account";
import { errorMessage } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";
import { addressSchema, type AddressInput } from "@/lib/validation/address";
import { AddressFields } from "./address-fields";

type SavedAddress = { id: string; title: string; fullName: string; phone: string; city: string; district: string; line: string; postalCode: string | null; isDefault: boolean };

export function AddressBook({ addresses, defaultName }: { addresses: SavedAddress[]; defaultName: string }) {
  const { dict } = useI18n();
  const [adding, setAdding] = useState(addresses.length === 0);
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const form = useForm<AddressInput>({
    resolver: zodResolver(addressSchema, undefined, { raw: true }),
    defaultValues: { title: "Ev", fullName: defaultName, phone: "", city: "", district: "", line: "", postalCode: "", isDefault: false },
  });

  return (
    <div className="space-y-6">
      {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}
      {addresses.length === 0 ? <p className="text-ink-2">{dict.account.addressesEmpty}</p> : null}
      <ul className="grid gap-4 md:grid-cols-2">
        {addresses.map((a) => (
          <li key={a.id} className="rounded-2xl border border-line bg-surface p-5 text-sm">
            <p className="flex items-center gap-2 font-semibold">
              <MapPin aria-hidden className="size-4 text-teal" />
              {a.title}
              {a.isDefault ? <Badge tone="teal">{dict.account.defaultAddress}</Badge> : null}
            </p>
            <p className="mt-2 text-ink-2">
              {a.fullName} · {a.phone}
              <br />
              {a.line}
              <br />
              {a.district}/{a.city} {a.postalCode ?? ""}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {!a.isDefault ? (
                <Button variant="ghost" size="sm" disabled={pending} onClick={() => start(async () => void (await setDefaultAddressAction(a.id)))}>
                  <Star aria-hidden className="size-4" />
                  {dict.account.makeDefault}
                </Button>
              ) : null}
              <Button variant="ghost" size="sm" disabled={pending} onClick={() => start(async () => void (await deleteAddressAction(a.id)))}>
                <Trash2 aria-hidden className="size-4" />
                {dict.account.deleteAddress}
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {adding ? (
        <form
          noValidate
          className="space-y-4 rounded-2xl border border-line bg-surface p-5"
          onSubmit={form.handleSubmit(async (values) => {
            const result = await saveAddressAction(values);
            if (result.ok) {
              setMessage({ tone: "success", text: dict.account.addressSaved });
              form.reset();
              setAdding(false);
            } else setMessage({ tone: "error", text: errorMessage(dict, result.error) });
          })}
        >
          <h2 className="font-display text-xl">{dict.account.addAddress}</h2>
          <AddressFields register={form.register} errors={form.formState.errors} />
          <Checkbox label={dict.account.makeDefault} {...form.register("isDefault")} />
          <div className="flex gap-2">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {dict.common.save}
            </Button>
            {addresses.length ? (
              <Button variant="ghost" onClick={() => setAdding(false)}>
                {dict.common.cancel}
              </Button>
            ) : null}
          </div>
        </form>
      ) : (
        <Button variant="outline" onClick={() => setAdding(true)}>
          <Plus aria-hidden className="size-4" />
          {dict.account.addAddress}
        </Button>
      )}
    </div>
  );
}
