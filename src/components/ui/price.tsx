import { formatTRY } from "@/lib/domain/money";
import { cn } from "./cn";

export function Price({ amount, compareAt, className, label }: { amount: number; compareAt?: number | null; className?: string; label?: string }) {
  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-2 num", className)}>
      <span className="font-semibold text-ink">
        {label ? <span className="sr-only">{label} </span> : null}
        {formatTRY(amount)}
      </span>
      {compareAt && compareAt > amount ? <s className="text-sm text-ink-2">{formatTRY(compareAt)}</s> : null}
    </span>
  );
}
