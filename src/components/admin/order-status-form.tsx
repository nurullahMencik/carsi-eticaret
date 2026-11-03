"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { updateOrderStatusAction } from "@/lib/actions/admin";
import type { OrderStatus } from "@/lib/domain/order-status";
import { errorMessage, validationMessage } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";
import { CARRIERS, orderStatusUpdateSchema, type OrderStatusUpdateInput } from "@/lib/validation/order";

export function OrderStatusForm({ orderId, options }: { orderId: string; options: OrderStatus[] }) {
  const { dict } = useI18n();
  const o = dict.admin.orders;
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const form = useForm<OrderStatusUpdateInput>({
    resolver: zodResolver(orderStatusUpdateSchema, undefined, { raw: true }),
    defaultValues: { orderId, toStatus: options[0], note: "", carrier: CARRIERS[0], trackingNumber: "" },
  });
  const to = useWatch({ control: form.control, name: "toStatus" });
  const errors = form.formState.errors;
  if (options.length === 0) return <p className="text-sm text-ink-2">{o.noTransitions}</p>;
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={form.handleSubmit(async (values) => {
        setMessage(null);
        const result = await updateOrderStatusAction(values);
        if (result.ok) setMessage({ tone: "success", text: o.statusUpdated });
        else setMessage({ tone: "error", text: errorMessage(dict, result.error) });
      })}
    >
      <Field id="toStatus" label={o.newStatus}>
        <Select id="toStatus" {...form.register("toStatus")} data-testid="status-select">
          {options.map((s) => (
            <option key={s} value={s}>
              {dict.orderStatus[s]}
            </option>
          ))}
        </Select>
      </Field>
      {to === "SHIPPED" ? (
        <>
          <Field id="carrier" label={o.carrier} error={validationMessage(dict, errors.carrier?.message)}>
            <Select id="carrier" {...form.register("carrier")}>
              {CARRIERS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="trackingNumber" label={o.trackingNumber} error={validationMessage(dict, errors.trackingNumber?.message)}>
            <Input id="trackingNumber" aria-invalid={Boolean(errors.trackingNumber)} {...form.register("trackingNumber")} />
          </Field>
        </>
      ) : null}
      {to === "CANCELLED" || to === "REFUNDED" ? <Alert tone="warning">{o.refundWarning}</Alert> : null}
      <Field id="note" label={`${o.note} (${dict.common.optional})`}>
        <Textarea id="note" rows={2} {...form.register("note")} />
      </Field>
      {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}
      <Button type="submit" disabled={form.formState.isSubmitting} data-testid="status-submit">
        {form.formState.isSubmitting ? dict.common.saving : o.apply}
      </Button>
    </form>
  );
}
