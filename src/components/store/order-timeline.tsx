import { Check, Circle, X } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { FULFILMENT_FLOW } from "@/lib/domain/order-status";
import { formatDateTime, type Dictionary, type Locale } from "@/lib/i18n";

type Event = { id: string; fromStatus: string | null; toStatus: string; actorRole: string; note: string | null; createdAt: Date };

export function OrderTimeline({ status, events, dict, locale }: { status: string; events: Event[]; dict: Dictionary; locale: Locale }) {
  const reached = new Map(events.map((e) => [e.toStatus, e.createdAt]));
  const terminal = status === "CANCELLED" || status === "REFUNDED";
  const statusLabel = dict.orderStatus as Record<string, string>;
  const steps = terminal ? [...FULFILMENT_FLOW.filter((s) => reached.has(s)), status] : FULFILMENT_FLOW;
  const currentIndex = steps.indexOf(status);
  return (
    <ol className="relative space-y-6" data-testid="order-timeline">
      {steps.map((step, i) => {
        const done = i <= currentIndex;
        const at = reached.get(step);
        const bad = step === "CANCELLED" || step === "REFUNDED";
        return (
          <li key={step} className="relative flex gap-4">
            {i < steps.length - 1 ? (
              <span aria-hidden className={cn("absolute top-8 left-[0.95rem] h-[calc(100%-0.5rem)] w-0.5", i < currentIndex ? "bg-success" : "bg-line")} />
            ) : null}
            <span
              className={cn(
                "relative z-10 inline-flex size-8 shrink-0 items-center justify-center rounded-full border-2",
                bad ? "border-danger bg-danger-soft text-danger" : done ? "border-success bg-success text-white dark:text-canvas" : "border-line bg-surface text-ink-2",
              )}
            >
              {bad ? <X aria-hidden className="size-4" /> : done ? <Check aria-hidden className="size-4" /> : <Circle aria-hidden className="size-2.5" />}
            </span>
            <div className="pt-1">
              <p className={cn("font-medium", !done && "text-ink-2")} aria-current={i === currentIndex ? "step" : undefined}>
                {statusLabel[step] ?? step}
              </p>
              {at ? <p className="text-xs text-ink-2">{formatDateTime(at, locale)}</p> : null}
              {events
                .filter((e) => e.toStatus === step && e.note && e.note !== "DEMO" && e.note !== "IYZICO")
                .map((e) => (
                  <p key={e.id} className="mt-1 text-sm text-ink-2">
                    {e.note}
                  </p>
                ))}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
