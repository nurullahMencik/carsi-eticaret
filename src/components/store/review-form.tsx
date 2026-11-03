"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Star } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { Field, Input, Textarea } from "@/components/ui/field";
import { createReviewAction } from "@/lib/actions/account";
import { errorMessage, fmt, validationMessage } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";
import { reviewSchema, type ReviewInput } from "@/lib/validation/review";

export function ReviewForm({ productId, slug }: { productId: string; slug: string }) {
  const { dict } = useI18n();
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<ReviewInput>({
    resolver: zodResolver(reviewSchema, undefined, { raw: true }),
    defaultValues: { productId, rating: 0, title: "", body: "" },
  });
  const rating = Number(useWatch({ control: form.control, name: "rating" }));
  const errors = form.formState.errors;

  if (done) return <Alert tone="success">{dict.product.reviewThanks}</Alert>;

  return (
    <form
      noValidate
      className="space-y-4 rounded-2xl border border-line bg-surface p-5"
      onSubmit={form.handleSubmit(async (values) => {
        setServerError(null);
        const result = await createReviewAction(values, slug);
        if (result.ok) setDone(true);
        else setServerError(errorMessage(dict, result.error));
      })}
    >
      <h3 className="font-display text-xl">{dict.product.writeReview}</h3>
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">{dict.product.reviewRating}</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer">
              <input type="radio" value={n} className="peer sr-only" {...form.register("rating", { valueAsNumber: true })} />
              <span className="sr-only">{fmt(dict.product.stars, { n })}</span>
              <Star
                aria-hidden
                className={cn(
                  "size-7 rounded peer-focus-visible:outline-2 peer-focus-visible:outline-teal",
                  n <= rating ? "fill-[#c98a1b] text-[#c98a1b]" : "text-line-strong",
                )}
              />
            </label>
          ))}
        </div>
        {errors.rating ? <p className="mt-1 text-sm text-danger">{validationMessage(dict, errors.rating.message)}</p> : null}
      </fieldset>
      <Field id="review-title" label={`${dict.product.reviewTitle} (${dict.common.optional})`} error={validationMessage(dict, errors.title?.message)}>
        <Input id="review-title" {...form.register("title")} />
      </Field>
      <Field id="review-body" label={dict.product.reviewBody} error={validationMessage(dict, errors.body?.message)}>
        <Textarea id="review-body" rows={4} aria-invalid={Boolean(errors.body)} {...form.register("body")} />
      </Field>
      {serverError ? <Alert tone="error">{serverError}</Alert> : null}
      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? dict.common.saving : dict.product.reviewSubmit}
      </Button>
    </form>
  );
}
