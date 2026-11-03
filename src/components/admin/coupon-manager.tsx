"use client";

import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select } from "@/components/ui/field";
import { deleteCouponAction, saveCouponAction } from "@/lib/actions/admin";
import { formatTRY } from "@/lib/domain/money";
import { errorMessage, formatDate, validationMessage } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";
import { couponSchema, type CouponFormInput } from "@/lib/validation/coupon";

export type CouponRow = {
  id: string;
  code: string;
  type: string;
  value: number;
  minSubtotal: number;
  maxDiscount: number | null;
  startsAt: string | null;
  endsAt: string | null;
  usageLimit: number | null;
  usedCount: number;
  isActive: boolean;
  descriptionTr: string;
  descriptionEn: string;
};

const toDateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : "");

export function CouponManager({ rows, now }: { rows: CouponRow[]; now: string }) {
  const { dict, locale } = useI18n();
  const c = dict.admin.coupons;
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const form = useForm<CouponFormInput>({ resolver: zodResolver(couponSchema, undefined, { raw: true }) });
  const errors = form.formState.errors;
  const type = useWatch({ control: form.control, name: "type" });

  function open(row: CouponRow | null) {
    setMessage(null);
    setEditing(row ? row.id : "new");
    form.reset(
      row
        ? {
            code: row.code,
            type: row.type as "PERCENT" | "FIXED",
            value: row.type === "FIXED" ? row.value / 100 : row.value,
            minSubtotal: row.minSubtotal / 100,
            maxDiscount: row.maxDiscount ? row.maxDiscount / 100 : "",
            startsAt: toDateInput(row.startsAt),
            endsAt: toDateInput(row.endsAt),
            usageLimit: row.usageLimit ?? "",
            isActive: row.isActive,
            descriptionTr: row.descriptionTr,
            descriptionEn: row.descriptionEn,
          }
        : { code: "", type: "PERCENT", value: 10, minSubtotal: 0, maxDiscount: "", startsAt: "", endsAt: "", usageLimit: "", isActive: true, descriptionTr: "", descriptionEn: "" },
    );
  }

  const status = (r: CouponRow) => {
    const t = new Date(now).getTime();
    if (!r.isActive) return { tone: "neutral" as const, label: c.statusInactive };
    if (r.endsAt && new Date(r.endsAt).getTime() < t) return { tone: "danger" as const, label: c.statusExpired };
    if (r.startsAt && new Date(r.startsAt).getTime() > t) return { tone: "warning" as const, label: c.statusScheduled };
    return { tone: "success" as const, label: c.statusActive };
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_24rem]">
      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full min-w-[48rem] text-sm">
          <caption className="sr-only">{c.title}</caption>
          <thead className="text-left text-xs text-ink-2">
            <tr className="border-b border-line">
              <th scope="col" className="px-4 py-2.5 font-medium">{c.code}</th>
              <th scope="col" className="px-4 py-2.5 font-medium">{c.value}</th>
              <th scope="col" className="px-4 py-2.5 font-medium">{c.minSubtotal}</th>
              <th scope="col" className="px-4 py-2.5 font-medium">{c.validity}</th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">{c.used}</th>
              <th scope="col" className="px-4 py-2.5 font-medium">{dict.common.status}</th>
              <th scope="col" className="px-4 py-2.5"><span className="sr-only">{dict.common.actions}</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const s = status(r);
              return (
                <tr key={r.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-2.5">
                    <span className="font-mono font-semibold">{r.code}</span>
                    <span className="block text-xs text-ink-2">{locale === "en" ? r.descriptionEn : r.descriptionTr}</span>
                  </td>
                  <td className="px-4 py-2.5 num">
                    {r.type === "PERCENT" ? `%${r.value}` : formatTRY(r.value)}
                    {r.maxDiscount ? <span className="block text-xs text-ink-2">≤ {formatTRY(r.maxDiscount)}</span> : null}
                  </td>
                  <td className="px-4 py-2.5 num">{formatTRY(r.minSubtotal)}</td>
                  <td className="px-4 py-2.5 text-xs text-ink-2">
                    {r.startsAt ? formatDate(r.startsAt, locale) : "—"} → {r.endsAt ? formatDate(r.endsAt, locale) : "∞"}
                  </td>
                  <td className="px-4 py-2.5 text-right num">
                    {r.usedCount} / {r.usageLimit ?? c.unlimited}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge tone={s.tone}>{s.label}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    <Button variant="ghost" size="sm" onClick={() => open(r)} aria-label={`${dict.common.edit}: ${r.code}`}>
                      <Pencil aria-hidden className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      aria-label={`${dict.common.delete}: ${r.code}`}
                      onClick={() =>
                        start(async () => {
                          const result = await deleteCouponAction(r.id);
                          setMessage(result.ok ? { tone: "success", text: c.deleted } : { tone: "error", text: errorMessage(dict, result.error) });
                        })
                      }
                    >
                      <Trash2 aria-hidden className="size-4" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="space-y-4">
        {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}
        {editing ? (
          <form
            noValidate
            className="space-y-4 rounded-xl border border-line bg-surface p-5"
            onSubmit={form.handleSubmit(async (values) => {
              const result = await saveCouponAction(editing === "new" ? null : editing, values);
              if (result.ok) {
                setMessage({ tone: "success", text: c.saved });
                setEditing(null);
              } else {
                for (const [key, code] of Object.entries(result.fieldErrors ?? {})) form.setError(key as never, { message: code });
                setMessage({ tone: "error", text: errorMessage(dict, result.error) });
              }
            })}
          >
            <h2 className="text-sm font-semibold">{editing === "new" ? c.new : dict.common.edit}</h2>
            <Field id="cp-code" label={c.code} error={validationMessage(dict, errors.code?.message)}>
              <Input id="cp-code" className="font-mono uppercase" {...form.register("code")} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field id="cp-type" label={c.type}>
                <Select id="cp-type" {...form.register("type")}>
                  <option value="PERCENT">{c.typePercent}</option>
                  <option value="FIXED">{c.typeFixed}</option>
                </Select>
              </Field>
              <Field id="cp-value" label={type === "FIXED" ? c.valueHintFixed : c.valueHintPercent} error={validationMessage(dict, errors.value?.message)}>
                <Input id="cp-value" type="number" step="0.01" {...form.register("value")} />
              </Field>
              <Field id="cp-min" label={c.minSubtotal} error={validationMessage(dict, errors.minSubtotal?.message)}>
                <Input id="cp-min" type="number" step="0.01" min={0} {...form.register("minSubtotal")} />
              </Field>
              <Field id="cp-max" label={c.maxDiscount}>
                <Input id="cp-max" type="number" step="0.01" min={0} {...form.register("maxDiscount")} />
              </Field>
              <Field id="cp-start" label={c.startsAt}>
                <Input id="cp-start" type="date" {...form.register("startsAt")} />
              </Field>
              <Field id="cp-end" label={c.endsAt} error={validationMessage(dict, errors.endsAt?.message)}>
                <Input id="cp-end" type="date" {...form.register("endsAt")} />
              </Field>
              <Field id="cp-limit" label={c.usageLimit}>
                <Input id="cp-limit" type="number" min={1} {...form.register("usageLimit")} />
              </Field>
            </div>
            <Field id="cp-descTr" label={c.descriptionTr}>
              <Input id="cp-descTr" {...form.register("descriptionTr")} />
            </Field>
            <Field id="cp-descEn" label={c.descriptionEn}>
              <Input id="cp-descEn" {...form.register("descriptionEn")} />
            </Field>
            <Checkbox label={c.isActive} {...form.register("isActive")} />
            <div className="flex gap-2">
              <Button type="submit" disabled={form.formState.isSubmitting}>{dict.common.save}</Button>
              <Button variant="ghost" onClick={() => setEditing(null)}>{dict.common.cancel}</Button>
            </div>
          </form>
        ) : (
          <Button variant="outline" onClick={() => open(null)}>
            <Plus aria-hidden className="size-4" />
            {c.new}
          </Button>
        )}
      </div>
    </div>
  );
}
