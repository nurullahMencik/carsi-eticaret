"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreditCard, Lock } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { payWithDemoCardAction } from "@/lib/actions/checkout";
import { errorMessage, fmt, validationMessage, type Dictionary } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";
import { demoCardSchema, type DemoCardInput } from "@/lib/validation/payment";

export type TestCard = { number: string; brand: string; outcome: { result: "success" } | { result: "failure"; code: string } };

function groupCard(value: string) {
  return value
    .replace(/\D/g, "")
    .slice(0, 19)
    .replace(/(\d{4})(?=\d)/g, "$1 ");
}

function formatExpiry(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

export function failureText(dict: Dictionary, code: string) {
  const reasons = dict.checkout.failureReasons as Record<string, string>;
  return reasons[code] ?? (dict.errors as Record<string, string>)[code] ?? reasons.UNKNOWN!;
}

export function DemoPaymentForm({ orderNumber, amount, testCards, holder }: { orderNumber: string; amount: string; testCards: TestCard[]; holder: string }) {
  const { dict } = useI18n();
  const [failure, setFailure] = useState<string | null>(null);
  const form = useForm<DemoCardInput>({
    resolver: zodResolver(demoCardSchema, undefined, { raw: true }),
    defaultValues: { orderNumber, cardHolder: holder, cardNumber: "", expiry: "", cvc: "" },
  });
  const errors = form.formState.errors;
  const nextYear = String((new Date().getFullYear() + 2) % 100).padStart(2, "0");

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <form
        noValidate
        className="space-y-5 rounded-[1.5rem] border border-line bg-surface p-6"
        onSubmit={form.handleSubmit(async (values) => {
          setFailure(null);
          const result = await payWithDemoCardAction(values);
          if (result && !result.ok) setFailure(result.error === "VALIDATION" ? errorMessage(dict, "VALIDATION") : failureText(dict, result.error));
        })}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-display text-2xl">
            <CreditCard aria-hidden className="size-5 text-teal" />
            {dict.checkout.paymentTitle}
          </h2>
          <span className="rounded-full bg-warning-soft px-3 py-1 text-xs font-semibold text-warning">{dict.checkout.demoMode}</span>
        </div>
        <input type="hidden" {...form.register("orderNumber")} />
        <Field id="cardHolder" label={dict.checkout.cardHolder} error={validationMessage(dict, errors.cardHolder?.message)}>
          <Input id="cardHolder" autoComplete="cc-name" aria-invalid={Boolean(errors.cardHolder)} {...form.register("cardHolder")} />
        </Field>
        <Field id="cardNumber" label={dict.checkout.cardNumber} error={validationMessage(dict, errors.cardNumber?.message)}>
          <Input
            id="cardNumber"
            inputMode="numeric"
            autoComplete="cc-number"
            placeholder="0000 0000 0000 0000"
            className="font-mono tracking-wider"
            aria-invalid={Boolean(errors.cardNumber)}
            {...form.register("cardNumber", { onChange: (e) => (e.target.value = groupCard(e.target.value)) })}
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field id="expiry" label={dict.checkout.expiry} error={validationMessage(dict, errors.expiry?.message)}>
            <Input
              id="expiry"
              inputMode="numeric"
              autoComplete="cc-exp"
              placeholder="AA/YY"
              aria-invalid={Boolean(errors.expiry)}
              {...form.register("expiry", { onChange: (e) => (e.target.value = formatExpiry(e.target.value)) })}
            />
          </Field>
          <Field id="cvc" label={dict.checkout.cvc} error={validationMessage(dict, errors.cvc?.message)}>
            <Input id="cvc" inputMode="numeric" autoComplete="cc-csc" maxLength={4} aria-invalid={Boolean(errors.cvc)} {...form.register("cvc")} />
          </Field>
        </div>
        {failure ? (
          <Alert tone="error" title={dict.checkout.failedTitle}>
            <span data-testid="payment-error">{failure}</span>
            <span className="mt-1 block">{dict.checkout.failedText}</span>
          </Alert>
        ) : null}
        <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting} data-testid="pay-button">
          <Lock aria-hidden className="size-4" />
          {form.formState.isSubmitting ? dict.checkout.paying : fmt(dict.checkout.pay, { amount })}
        </Button>
        <p className="text-center text-xs text-ink-2">{dict.checkout.secure}</p>
      </form>

      <aside aria-labelledby="test-cards-title" className="space-y-3">
        <Alert tone="warning">{dict.checkout.demoNotice}</Alert>
        <h2 id="test-cards-title" className="pt-2 text-sm font-semibold">
          {dict.checkout.testCards}
        </h2>
        <ul className="space-y-2">
          {testCards.map((card) => (
            <li key={card.number} className="rounded-2xl border border-line bg-surface p-3 text-sm">
              <p className="font-mono text-[0.95rem] tracking-wider num">{groupCard(card.number)}</p>
              <p className={card.outcome.result === "success" ? "text-success" : "text-danger"}>
                {card.brand} ·{" "}
                {card.outcome.result === "success" ? dict.checkout.outcomeSuccess : fmt(dict.checkout.outcomeFailure, { reason: failureText(dict, card.outcome.code) })}
              </p>
              <button
                type="button"
                className="mt-1 text-xs font-semibold text-teal underline underline-offset-4"
                data-testid={`use-card-${card.number}`}
                onClick={() => {
                  form.setValue("cardNumber", groupCard(card.number), { shouldValidate: true });
                  form.setValue("expiry", `12/${nextYear}`, { shouldValidate: true });
                  form.setValue("cvc", "123", { shouldValidate: true });
                  setFailure(null);
                }}
              >
                {dict.checkout.useCard}
              </button>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
