/**
 * Generated cover for products without a photo: a tile pattern inspired by the product's
 * category (plates, çini stars, peştemal stripes, kilim lozenges, mosaic dots, hammered copper),
 * varied deterministically by the slug. Pure SVG, no network, works in server and client components.
 */
import { cn } from "@/components/ui/cn";

type Palette = { bg: string; a: string; b: string; c: string; text: string; band: string };

const PALETTES: Record<string, Palette[]> = {
  seramik: [
    { bg: "#eadfce", a: "#9c4221", b: "#25365c", c: "#d9c4a3", text: "#2a2018", band: "#f8f1e6" },
    { bg: "#dfe3d6", a: "#5f7a58", b: "#2a2018", c: "#c7d0bb", text: "#1f2a1c", band: "#f3f5ee" },
  ],
  cini: [
    { bg: "#e2ecef", a: "#1f4f5a", b: "#2a6fb0", c: "#c0392b", text: "#14323a", band: "#f4f9fa" },
    { bg: "#f1ece3", a: "#2a6fb0", b: "#1d8a8a", c: "#b8322a", text: "#182b3f", band: "#fbf8f2" },
  ],
  tekstil: [
    { bg: "#efe4d2", a: "#2f3f73", b: "#c9962b", c: "#b4532a", text: "#1d2547", band: "#fbf6ec" },
    { bg: "#e9e6dc", a: "#6b6b3a", b: "#d9c4a3", c: "#2f3f73", text: "#2b2b17", band: "#f7f5ee" },
  ],
  kilim: [
    { bg: "#e9d6c4", a: "#9b2335", b: "#2f3f73", c: "#c9962b", text: "#3b1219", band: "#f8efe6" },
    { bg: "#ece1cf", a: "#7a3b1f", b: "#1f4f5a", c: "#c46a3a", text: "#33180b", band: "#faf4ea" },
  ],
  aydinlatma: [
    { bg: "#1f2a30", a: "#e0a84f", b: "#2a9d9b", c: "#c0392b", text: "#fbf3e4", band: "#141c20" },
    { bg: "#2a1f2b", a: "#e0835a", b: "#8cc3cd", c: "#e8bb63", text: "#fbf1ea", band: "#1d151e" },
  ],
  "bakir-ahsap": [
    { bg: "#ecd9c4", a: "#b0643a", b: "#7a4a2a", c: "#d79a6b", text: "#3a2111", band: "#faf2e8" },
    { bg: "#e6dccd", a: "#8a5a3a", b: "#b0643a", c: "#5a3a22", text: "#2e1b0e", band: "#f7f1e8" },
  ],
};

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function Pattern({ kind, p, id, seed }: { kind: string; p: Palette; id: string; seed: number }) {
  const s = 1 + (seed % 3) * 0.15;
  switch (kind) {
    case "cini":
      return (
        <pattern id={id} width={80 * s} height={80 * s} patternUnits="userSpaceOnUse" patternTransform={`rotate(${seed % 2 ? 0 : 45})`}>
          <g transform={`scale(${s})`}>
            <rect width="80" height="80" fill={p.bg} />
            <g fill="none" stroke={p.a} strokeWidth="2.2">
              <rect x="22" y="22" width="36" height="36" />
              <rect x="22" y="22" width="36" height="36" transform="rotate(45 40 40)" />
            </g>
            <circle cx="40" cy="40" r="6" fill={p.c} />
            <circle cx="0" cy="0" r="5" fill={p.b} />
            <circle cx="80" cy="0" r="5" fill={p.b} />
            <circle cx="0" cy="80" r="5" fill={p.b} />
            <circle cx="80" cy="80" r="5" fill={p.b} />
          </g>
        </pattern>
      );
    case "tekstil": {
      const w = 120;
      return (
        <pattern id={id} width="400" height={w} patternUnits="userSpaceOnUse" patternTransform={`rotate(${seed % 2 ? 90 : 0})`}>
          <rect width="400" height={w} fill={p.bg} />
          <rect y="14" width="400" height="18" fill={p.a} />
          <rect y="38" width="400" height="4" fill={p.b} />
          <rect y="48" width="400" height="4" fill={p.b} />
          <rect y="76" width="400" height="10" fill={p.c} opacity="0.85" />
          <rect y="96" width="400" height="2" fill={p.a} />
        </pattern>
      );
    }
    case "kilim":
      return (
        <pattern id={id} width={100 * s} height={70 * s} patternUnits="userSpaceOnUse">
          <g transform={`scale(${s})`}>
            <rect width="100" height="70" fill={p.bg} />
            <path d="M50 6 L86 35 L50 64 L14 35 Z" fill={p.a} />
            <path d="M50 18 L71 35 L50 52 L29 35 Z" fill={p.bg} />
            <path d="M50 27 L60 35 L50 43 L40 35 Z" fill={p.b} />
            <path d="M0 0 L8 6 L0 12 Z M100 0 L92 6 L100 12 Z M0 58 L8 64 L0 70 Z M100 58 L92 64 L100 70 Z" fill={p.c} />
          </g>
        </pattern>
      );
    case "aydinlatma":
      return (
        <pattern id={id} width={44 * s} height={44 * s} patternUnits="userSpaceOnUse">
          <g transform={`scale(${s})`}>
            <rect width="44" height="44" fill={p.bg} />
            <circle cx="11" cy="11" r="7" fill={p.a} opacity="0.9" />
            <circle cx="33" cy="33" r="7" fill={p.b} opacity="0.9" />
            <circle cx="33" cy="11" r="3" fill={p.c} />
            <circle cx="11" cy="33" r="3" fill={p.a} opacity="0.6" />
          </g>
        </pattern>
      );
    case "bakir-ahsap":
      return (
        <pattern id={id} width={34 * s} height={30 * s} patternUnits="userSpaceOnUse">
          <g transform={`scale(${s})`}>
            <rect width="34" height="30" fill={p.bg} />
            <ellipse cx="9" cy="8" rx="7" ry="5" fill={p.a} opacity="0.35" />
            <ellipse cx="26" cy="22" rx="7" ry="5" fill={p.b} opacity="0.3" />
            <ellipse cx="26" cy="6" rx="4" ry="3" fill={p.c} opacity="0.45" />
            <ellipse cx="8" cy="24" rx="4" ry="3" fill={p.a} opacity="0.25" />
          </g>
        </pattern>
      );
    default:
      return (
        <pattern id={id} width="400" height="500" patternUnits="userSpaceOnUse">
          <rect width="400" height="500" fill={p.bg} />
          <g fill="none" strokeWidth="2">
            {[150, 120, 92, 64].map((r, i) => (
              <circle key={r} cx={200 + (seed % 40) - 20} cy="215" r={r * s * 0.9} stroke={i % 2 ? p.b : p.a} opacity={0.8 - i * 0.12} />
            ))}
          </g>
          <circle cx={200 + (seed % 40) - 20} cy="215" r={34 * s} fill={p.c} />
        </pattern>
      );
  }
}

export function ProductCover({
  slug,
  name,
  category,
  showName = true,
  className,
}: {
  slug: string;
  name: string;
  category: string;
  showName?: boolean;
  className?: string;
}) {
  const seed = hash(slug);
  const palettes = PALETTES[category] ?? PALETTES.seramik!;
  const p = palettes[seed % palettes.length]!;
  const id = `cover-${slug}`;
  return (
    <svg
      viewBox="0 0 400 500"
      preserveAspectRatio="xMidYMid slice"
      className={cn("h-full w-full", className)}
      role="img"
      aria-label={name}
    >
      <defs>
        <Pattern kind={category} p={p} id={id} seed={seed} />
      </defs>
      <rect width="400" height="500" fill={`url(#${id})`} />
      {showName ? (
        <g>
          <rect x="28" y="360" width="344" height="104" rx="6" fill={p.band} opacity="0.94" />
          <text
            x="200"
            y="404"
            textAnchor="middle"
            fill={p.text}
            style={{ fontFamily: "var(--font-display), Georgia, serif", fontSize: name.length > 26 ? 21 : 25 }}
          >
            {name.length > 34 ? `${name.slice(0, 32)}…` : name}
          </text>
          <text
            x="200"
            y="438"
            textAnchor="middle"
            fill={p.text}
            opacity="0.7"
            style={{ fontFamily: "var(--font-sans), sans-serif", fontSize: 13, letterSpacing: "0.18em" }}
          >
            ÇARŞI
          </text>
        </g>
      ) : null}
    </svg>
  );
}
