"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MapPin } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { Checkbox, Field, Textarea } from "@/components/ui/field";
import { placeOrderAction } from "@/lib/actions/checkout";
import { errorMessage, fmt, validationMessage } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";
import { checkoutSchema, type CheckoutInput } from "@/lib/validation/address";
import { AddressFields } from "./address-fields";

type SavedAddress = { id: string; title: string; fullName: string; phone: string; city: string; district: string; line: string; isDefault: boolean };

export function CheckoutForm({ addresses, shippingFee, defaultName }: { addresses: SavedAddress[]; shippingFee: string; defaultName: string }) {
  const { dict } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const defaultAddress = addresses.find((a) => a.isDefault) ?? addresses[0];
  const [mode, setMode] = useState<string>(defaultAddress?.id ?? "new");
  const form = useForm<CheckoutInput>({
    resolver: zodResolver(checkoutSchema, undefined, { raw: true }),
    defaultValues: {
      addressId: defaultAddress?.id,
      newAddress: undefined,
      saveAddress: true,
      note: "",
    },
  });
  const errors = form.formState.errors;

  function selectMode(value: string) {
    setMode(value);
    if (value === "new") {
      form.setValue("addressId", undefined);
      form.setValue("newAddress", { title: "Ev", fullName: defaultName, phone: "", city: "", district: "", line: "", postalCode: "" });
    } else {
      form.setValue("addressId", value);
      form.setValue("newAddress", undefined);
    }
  }

  return (
    <form
      noValidate
      className="space-y-8"
      onSubmit={form.handleSubmit(async (values) => {
        setError(null);
        const result = await placeOrderAction(values);
        if (result && !result.ok) setError(errorMessage(dict, result.error));
      })}
    >
      <section aria-labelledby="address-title" className="space-y-4">
        <h2 id="address-title" className="font-display text-2xl">
          {dict.checkout.addressTitle}
        </h2>
        <fieldset className="space-y-3">
          <legend className="sr-only">{dict.checkout.savedAddresses}</legend>
          {addresses.map((a) => (
            <label
              key={a.id}
              className={cn(
                "flex cursor-pointer gap-3 rounded-2xl border bg-surface p-4 transition",
                mode === a.id ? "border-ink ring-1 ring-ink" : "border-line hover:border-line-strong",
              )}
            >
              <input type="radio" name="address-choice" value={a.id} checked={mode === a.id} onChange={() => selectMode(a.id)} className="mt-1 accent-[var(--accent)]" />
              <span className="text-sm">
                <span className="flex items-center gap-2 font-semibold">
                  <MapPin aria-hidden className="size-4 text-teal" />
                  {a.title}
                </span>
                <span className="mt-1 block text-ink-2">
                  {a.fullName} · {a.phone}
                  <br />
                  {a.line}, {a.district}/{a.city}
                </span>
              </span>
            </label>
          ))}
          <label
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-2xl border bg-surface p-4 text-sm font-semibold transition",
              mode === "new" ? "border-ink ring-1 ring-ink" : "border-line hover:border-line-strong",
            )}
          >
            <input type="radio" name="address-choice" value="new" checked={mode === "new"} onChange={() => selectMode("new")} className="accent-[var(--accent)]" />
            {addresses.length ? dict.checkout.useNewAddress : dict.checkout.newAddress}
          </label>
        </fieldset>
        {errors.addressId ? <p className="text-sm text-danger">{validationMessage(dict, errors.addressId.message)}</p> : null}
        {mode === "new" ? (
          <div className="space-y-4 rounded-2xl border border-line bg-surface p-5">
            <AddressFields register={form.register} errors={errors.newAddress as never} prefix="newAddress" />
            <Checkbox label={dict.checkout.saveAddress} {...form.register("saveAddress")} />
          </div>
        ) : null}
      </section>

      <section aria-labelledby="shipping-title" className="space-y-3">
        <h2 id="shipping-title" className="font-display text-2xl">
          {dict.checkout.shippingMethod}
        </h2>
        <div className="rounded-2xl border border-line bg-surface p-4 text-sm">
          <p className="font-semibold">{dict.checkout.shippingStandard}</p>
          <p className="mt-1 text-ink-2">{fmt(dict.checkout.shippingRule, { fee: shippingFee })}</p>
        </div>
      </section>

      <Field id="note" label={`${dict.checkout.note} (${dict.common.optional})`} error={validationMessage(dict, errors.note?.message)}>
        <Textarea id="note" rows={2} placeholder={dict.checkout.notePlaceholder} {...form.register("note")} />
      </Field>

      {error ? <Alert tone="error">{error}</Alert> : null}
      <div className="space-y-3">
        <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={form.formState.isSubmitting} data-testid="place-order">
          {form.formState.isSubmitting ? dict.checkout.creatingOrder : dict.checkout.continueToPayment}
        </Button>
        <p className="text-xs text-ink-2">{dict.checkout.agreement}</p>
      </div>
    </form>
  );
}
