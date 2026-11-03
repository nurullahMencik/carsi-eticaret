"use client";

import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { Field, Input, Textarea } from "@/components/ui/field";
import { validationMessage } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";

/** Address inputs for react-hook-form; `prefix` lets them live inside a bigger form ("newAddress"). */
export function AddressFields({
  register,
  errors,
  prefix,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: UseFormRegister<any>;
  errors: FieldErrors | undefined;
  prefix?: string;
}) {
  const { dict } = useI18n();
  const name = (field: string) => (prefix ? `${prefix}.${field}` : field);
  const id = (field: string) => `addr-${field}`;
  const err = (field: string) => validationMessage(dict, (errors?.[field] as { message?: string } | undefined)?.message);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field id={id("title")} label={dict.address.title} error={err("title")}>
        <Input id={id("title")} placeholder={dict.address.titlePlaceholder} aria-invalid={Boolean(err("title"))} {...register(name("title"))} />
      </Field>
      <Field id={id("fullName")} label={dict.address.fullName} error={err("fullName")}>
        <Input id={id("fullName")} autoComplete="name" aria-invalid={Boolean(err("fullName"))} {...register(name("fullName"))} />
      </Field>
      <Field id={id("phone")} label={dict.address.phone} error={err("phone")}>
        <Input id={id("phone")} type="tel" autoComplete="tel" placeholder="0532 123 45 67" aria-invalid={Boolean(err("phone"))} {...register(name("phone"))} />
      </Field>
      <Field id={id("city")} label={dict.address.city} error={err("city")}>
        <Input id={id("city")} autoComplete="address-level1" aria-invalid={Boolean(err("city"))} {...register(name("city"))} />
      </Field>
      <Field id={id("district")} label={dict.address.district} error={err("district")}>
        <Input id={id("district")} autoComplete="address-level2" aria-invalid={Boolean(err("district"))} {...register(name("district"))} />
      </Field>
      <Field id={id("postalCode")} label={`${dict.address.postalCode} (${dict.common.optional})`} error={err("postalCode")}>
        <Input id={id("postalCode")} inputMode="numeric" autoComplete="postal-code" aria-invalid={Boolean(err("postalCode"))} {...register(name("postalCode"))} />
      </Field>
      <Field id={id("line")} label={dict.address.line} error={err("line")} className="sm:col-span-2">
        <Textarea id={id("line")} rows={2} autoComplete="street-address" aria-invalid={Boolean(err("line"))} {...register(name("line"))} />
      </Field>
    </div>
  );
}
