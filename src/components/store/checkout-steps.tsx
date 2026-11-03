import { Check } from "lucide-react";
import { cn } from "@/components/ui/cn";
import type { Dictionary } from "@/lib/i18n";

const STEPS = ["address", "payment", "done"] as const;

export function CheckoutSteps({ current, dict }: { current: (typeof STEPS)[number]; dict: Dictionary }) {
  const index = STEPS.indexOf(current);
  return (
    <ol className="flex items-center gap-2 text-sm" aria-label={dict.checkout.title}>
      {STEPS.map((step, i) => (
        <li key={step} className="flex items-center gap-2" aria-current={i === index ? "step" : undefined}>
          <span
            className={cn(
              "inline-flex size-7 items-center justify-center rounded-full text-xs font-bold",
              i < index ? "bg-success text-white dark:text-canvas" : i === index ? "bg-ink text-canvas" : "bg-surface-2 text-ink-2",
            )}
          >
            {i < index ? <Check aria-hidden className="size-4" /> : i + 1}
          </span>
          <span className={i === index ? "font-semibold" : "text-ink-2"}>{dict.checkout.steps[step]}</span>
          {i < STEPS.length - 1 ? <span aria-hidden className="mx-1 h-px w-8 bg-line-strong sm:w-14" /> : null}
        </li>
      ))}
    </ol>
  );
}
