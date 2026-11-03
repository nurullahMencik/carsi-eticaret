"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { deleteCategoryAction, saveCategoryAction } from "@/lib/actions/admin";
import { errorMessage, validationMessage } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";
import { categorySchema, type CategoryFormInput } from "@/lib/validation/catalog";

type Row = { id: string; slug: string; nameTr: string; nameEn: string; descriptionTr: string; descriptionEn: string; sortOrder: number; products: number };

const EMPTY: CategoryFormInput = { slug: "", nameTr: "", nameEn: "", descriptionTr: "", descriptionEn: "", sortOrder: 0 };

export function CategoryManager({ rows }: { rows: Row[] }) {
  const { dict } = useI18n();
  const c = dict.admin.categories;
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const form = useForm<CategoryFormInput>({ resolver: zodResolver(categorySchema, undefined, { raw: true }), defaultValues: EMPTY });
  const errors = form.formState.errors;

  function open(row: Row | null) {
    setMessage(null);
    setEditing(row ? row.id : "new");
    form.reset(row ? { ...row } : { ...EMPTY, sortOrder: rows.length });
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_24rem]">
      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full min-w-[36rem] text-sm">
          <caption className="sr-only">{c.title}</caption>
          <thead className="text-left text-xs text-ink-2">
            <tr className="border-b border-line">
              <th scope="col" className="px-4 py-2.5 font-medium">{c.sortOrder}</th>
              <th scope="col" className="px-4 py-2.5 font-medium">{c.nameTr}</th>
              <th scope="col" className="px-4 py-2.5 font-medium">{c.slug}</th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">{c.products}</th>
              <th scope="col" className="px-4 py-2.5"><span className="sr-only">{dict.common.actions}</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-line last:border-0">
                <td className="px-4 py-2.5 text-ink-2 num">{r.sortOrder}</td>
                <td className="px-4 py-2.5">
                  {r.nameTr}
                  <span className="block text-xs text-ink-2">{r.nameEn}</span>
                </td>
                <td className="px-4 py-2.5 font-mono text-xs">{r.slug}</td>
                <td className="px-4 py-2.5 text-right num">{r.products}</td>
                <td className="px-4 py-2.5 text-right whitespace-nowrap">
                  <Button variant="ghost" size="sm" onClick={() => open(r)} aria-label={`${dict.common.edit}: ${r.nameTr}`}>
                    <Pencil aria-hidden className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    aria-label={`${dict.common.delete}: ${r.nameTr}`}
                    onClick={() =>
                      start(async () => {
                        const result = await deleteCategoryAction(r.id);
                        setMessage(result.ok ? { tone: "success", text: c.deleted } : { tone: "error", text: errorMessage(dict, result.error) });
                      })
                    }
                  >
                    <Trash2 aria-hidden className="size-4" />
                  </Button>
                </td>
              </tr>
            ))}
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
              const result = await saveCategoryAction(editing === "new" ? null : editing, values);
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
            <Field id="cat-nameTr" label={c.nameTr} error={validationMessage(dict, errors.nameTr?.message)}>
              <Input id="cat-nameTr" {...form.register("nameTr")} />
            </Field>
            <Field id="cat-nameEn" label={c.nameEn} error={validationMessage(dict, errors.nameEn?.message)}>
              <Input id="cat-nameEn" {...form.register("nameEn")} />
            </Field>
            <Field id="cat-slug" label={c.slug} error={validationMessage(dict, errors.slug?.message)}>
              <Input id="cat-slug" className="font-mono text-sm" {...form.register("slug")} />
            </Field>
            <Field id="cat-descTr" label={c.descriptionTr}>
              <Textarea id="cat-descTr" rows={2} {...form.register("descriptionTr")} />
            </Field>
            <Field id="cat-descEn" label={c.descriptionEn}>
              <Textarea id="cat-descEn" rows={2} {...form.register("descriptionEn")} />
            </Field>
            <Field id="cat-sort" label={c.sortOrder} error={validationMessage(dict, errors.sortOrder?.message)}>
              <Input id="cat-sort" type="number" min={0} {...form.register("sortOrder")} />
            </Field>
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
