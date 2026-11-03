import { Badge, type BadgeTone } from "@/components/ui/badge";
import type { Dictionary } from "@/lib/i18n";

const TONES: Record<string, BadgeTone> = {
  PENDING: "warning",
  PAID: "teal",
  PREPARING: "accent",
  SHIPPED: "teal",
  DELIVERED: "success",
  CANCELLED: "neutral",
  REFUNDED: "danger",
};

export function StatusBadge({ status, dict }: { status: string; dict: Dictionary }) {
  const label = (dict.orderStatus as Record<string, string>)[status] ?? status;
  return (
    <Badge tone={TONES[status] ?? "neutral"}>
      <span data-testid="order-status">{label}</span>
    </Badge>
  );
}
