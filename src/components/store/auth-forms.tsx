"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ShieldCheck, Store, UserRound } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { demoLoginAction, loginAction, registerAction } from "@/lib/actions/auth";
import { errorMessage, validationMessage } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";
import { loginSchema, registerSchema, type LoginInput, type RegisterInput } from "@/lib/validation/auth";

export function LoginForm({ callbackUrl, demoEnabled }: { callbackUrl?: string; demoEnabled: boolean }) {
  const { dict } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [demoPending, startDemo] = useTransition();
  const form = useForm<LoginInput>({ resolver: zodResolver(loginSchema, undefined, { raw: true }), defaultValues: { email: "", password: "", callbackUrl } });
  const errors = form.formState.errors;

  return (
    <div className="space-y-8">
      {demoEnabled ? (
        <section aria-labelledby="demo-title" className="rounded-2xl border border-teal/30 bg-teal-soft p-5">
          <h2 id="demo-title" className="font-semibold">
            {dict.auth.demoTitle}
          </h2>
          <p className="mt-1 text-sm text-ink-2">{dict.auth.demoText}</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {(
              [
                ["customer", dict.auth.demoCustomer, UserRound],
                ["admin", dict.auth.demoAdmin, ShieldCheck],
                ["staff", dict.auth.demoStaff, Store],
              ] as const
            ).map(([account, label, Icon]) => (
              <Button
                key={account}
                variant={account === "customer" ? "secondary" : "outline"}
                size="sm"
                disabled={demoPending}
                data-testid={`demo-login-${account}`}
                onClick={() =>
                  startDemo(async () => {
                    const result = await demoLoginAction(account, callbackUrl);
                    if (result && !result.ok) setError(errorMessage(dict, result.error));
                  })
                }
              >
                <Icon aria-hidden className="size-4" />
                {label}
              </Button>
            ))}
          </div>
        </section>
      ) : null}
      <form
        noValidate
        className="space-y-4"
        onSubmit={form.handleSubmit(async (values) => {
          setError(null);
          const result = await loginAction(values);
          if (result && !result.ok) setError(result.error === "INVALID_CREDENTIALS" ? dict.auth.invalidCredentials : errorMessage(dict, result.error));
        })}
      >
        <Field id="email" label={dict.auth.email} error={validationMessage(dict, errors.email?.message)}>
          <Input id="email" type="email" autoComplete="email" aria-invalid={Boolean(errors.email)} {...form.register("email")} />
        </Field>
        <Field id="password" label={dict.auth.password} error={validationMessage(dict, errors.password?.message)}>
          <Input id="password" type="password" autoComplete="current-password" aria-invalid={Boolean(errors.password)} {...form.register("password")} />
        </Field>
        {error ? <Alert tone="error">{error}</Alert> : null}
        <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? dict.common.loading : dict.auth.submitLogin}
        </Button>
        <p className="text-center text-sm text-ink-2">
          {dict.auth.noAccount}{" "}
          <Link href={callbackUrl ? `/kayit?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/kayit"} className="font-semibold text-teal underline underline-offset-4">
            {dict.auth.registerTitle}
          </Link>
        </p>
      </form>
    </div>
  );
}

export function RegisterForm({ callbackUrl }: { callbackUrl?: string }) {
  const { dict } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema, undefined, { raw: true }),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });
  const errors = form.formState.errors;
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={form.handleSubmit(async (values) => {
        setError(null);
        const result = await registerAction({ ...values, callbackUrl });
        if (result && !result.ok) {
          if (result.error === "EMAIL_TAKEN") form.setError("email", { message: "emailTaken" });
          else setError(errorMessage(dict, result.error));
        }
      })}
    >
      <Field id="name" label={dict.auth.name} error={validationMessage(dict, errors.name?.message)}>
        <Input id="name" autoComplete="name" aria-invalid={Boolean(errors.name)} {...form.register("name")} />
      </Field>
      <Field
        id="email"
        label={dict.auth.email}
        error={errors.email?.message === "emailTaken" ? dict.auth.emailTaken : validationMessage(dict, errors.email?.message)}
      >
        <Input id="email" type="email" autoComplete="email" aria-invalid={Boolean(errors.email)} {...form.register("email")} />
      </Field>
      <Field id="password" label={dict.auth.password} hint={dict.auth.passwordHint} error={validationMessage(dict, errors.password?.message)}>
        <Input id="password" type="password" autoComplete="new-password" aria-invalid={Boolean(errors.password)} {...form.register("password")} />
      </Field>
      <Field id="confirmPassword" label={dict.auth.confirmPassword} error={validationMessage(dict, errors.confirmPassword?.message)}>
        <Input id="confirmPassword" type="password" autoComplete="new-password" aria-invalid={Boolean(errors.confirmPassword)} {...form.register("confirmPassword")} />
      </Field>
      {error ? <Alert tone="error">{error}</Alert> : null}
      <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? dict.common.loading : dict.auth.submitRegister}
      </Button>
      <p className="text-center text-sm text-ink-2">
        {dict.auth.haveAccount}{" "}
        <Link href="/giris" className="font-semibold text-teal underline underline-offset-4">
          {dict.auth.loginTitle}
        </Link>
      </p>
    </form>
  );
}
