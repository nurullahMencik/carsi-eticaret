import { ZodError } from "zod";
import { DomainError } from "@/lib/domain/errors";
import { fieldErrors, type FieldErrors } from "@/lib/validation/common";

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? { data?: undefined } : { data: T }))
  | { ok: false; error: string; fieldErrors?: FieldErrors; details?: Record<string, string | number> };

/** Maps thrown errors to a serialisable result. Unknown errors are logged and hidden. */
export function toActionError(error: unknown): Extract<ActionResult, { ok: false }> {
  if (error instanceof ZodError) return { ok: false, error: "VALIDATION", fieldErrors: fieldErrors(error) };
  if (error instanceof DomainError) return { ok: false, error: error.code };
  // Let Next.js redirects/notFound propagate.
  if (error && typeof error === "object" && "digest" in error && String((error as { digest: unknown }).digest).startsWith("NEXT_")) {
    throw error;
  }
  console.error("[carsi] action failed", error);
  return { ok: false, error: "UNKNOWN" };
}
