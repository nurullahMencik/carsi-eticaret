import { Star } from "lucide-react";
import { cn } from "./cn";

/** Read-only star rating. `label` is the accessible description (e.g. "Rated 4.5 out of 5"). */
export function Stars({ value, label, size = 14, className }: { value: number; label: string; size?: number; className?: string }) {
  return (
    <span role="img" aria-label={label} className={cn("inline-flex items-center gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.max(0, Math.min(1, value - (i - 1)));
        return (
          <span key={i} className="relative inline-block" style={{ width: size, height: size }} aria-hidden>
            <Star width={size} height={size} className="absolute inset-0 text-line-strong" strokeWidth={1.5} />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star width={size} height={size} className="fill-[#c98a1b] text-[#c98a1b]" strokeWidth={1.5} />
            </span>
          </span>
        );
      })}
    </span>
  );
}
