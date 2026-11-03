import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "./cn";

const styles = {
  info: { box: "bg-teal-soft text-ink border-teal/30", icon: Info, iconClass: "text-teal" },
  success: { box: "bg-success-soft text-ink border-success/30", icon: CheckCircle2, iconClass: "text-success" },
  warning: { box: "bg-warning-soft text-ink border-warning/30", icon: AlertTriangle, iconClass: "text-warning" },
  error: { box: "bg-danger-soft text-ink border-danger/30", icon: XCircle, iconClass: "text-danger" },
} as const;

export function Alert({
  tone = "info",
  title,
  children,
  className,
  role,
}: {
  tone?: keyof typeof styles;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
  role?: "alert" | "status";
}) {
  const s = styles[tone];
  const Icon = s.icon;
  return (
    <div role={role ?? (tone === "error" ? "alert" : "status")} className={cn("flex gap-3 rounded-2xl border px-4 py-3 text-sm", s.box, className)}>
      <Icon aria-hidden className={cn("mt-0.5 size-4 shrink-0", s.iconClass)} />
      <div className="space-y-0.5">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className="text-ink/90">{children}</div> : null}
      </div>
    </div>
  );
}
