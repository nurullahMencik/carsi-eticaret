import Link from "next/link";

export function Logo({ href = "/", label = "Çarşı" }: { href?: string; label?: string }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-2.5 rounded-md" aria-label={label}>
      <svg viewBox="0 0 64 64" className="size-8 shrink-0" aria-hidden>
        <rect width="64" height="64" rx="14" className="fill-accent" />
        <g fill="none" strokeWidth="3.2" strokeLinejoin="round" className="stroke-canvas">
          <rect x="17" y="17" width="30" height="30" />
          <rect x="17" y="17" width="30" height="30" transform="rotate(45 32 32)" />
        </g>
        <circle cx="32" cy="32" r="5" className="fill-canvas" />
      </svg>
      <span className="font-display text-[1.6rem] leading-none font-semibold tracking-tight text-ink">Çarşı</span>
    </Link>
  );
}
