import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "./cn";

function pageList(page: number, pageCount: number): Array<number | "…"> {
  const pages = new Set([1, pageCount, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pageCount));
  const sorted = [...pages].sort((a, b) => a - b);
  const out: Array<number | "…"> = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1]! > 1) out.push("…");
    out.push(p);
  });
  return out;
}

export function Pagination({
  page,
  pageCount,
  href,
  labels,
}: {
  page: number;
  pageCount: number;
  href: (page: number) => string;
  labels: { nav: string; previous: string; next: string; page: string };
}) {
  if (pageCount <= 1) return null;
  const item = "inline-flex size-10 items-center justify-center rounded-full text-sm num";
  return (
    <nav aria-label={labels.nav} className="mt-12 flex items-center justify-center gap-1">
      {page > 1 ? (
        <Link href={href(page - 1)} className={cn(item, "hover:bg-surface-2")} aria-label={labels.previous} rel="prev">
          <ChevronLeft aria-hidden className="size-4" />
        </Link>
      ) : null}
      {pageList(page, pageCount).map((p, i) =>
        p === "…" ? (
          <span key={`gap-${i}`} className={cn(item, "text-ink-2")} aria-hidden>
            …
          </span>
        ) : (
          <Link
            key={p}
            href={href(p)}
            aria-current={p === page ? "page" : undefined}
            aria-label={labels.page.replace("{page}", String(p))}
            className={cn(item, p === page ? "bg-ink text-canvas" : "hover:bg-surface-2")}
          >
            {p}
          </Link>
        ),
      )}
      {page < pageCount ? (
        <Link href={href(page + 1)} className={cn(item, "hover:bg-surface-2")} aria-label={labels.next} rel="next">
          <ChevronRight aria-hidden className="size-4" />
        </Link>
      ) : null}
    </nav>
  );
}
