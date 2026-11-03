"use client";

import { useState } from "react";
import { cn } from "@/components/ui/cn";
import { fmt } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";
import { ProductImage } from "./product-image";

export function ProductGallery({ images, name, slug, category }: { images: { url: string; alt: string }[]; name: string; slug: string; category: string }) {
  const { dict } = useI18n();
  const [active, setActive] = useState(0);
  const current = images[active];
  return (
    <div className="space-y-3" aria-label={dict.product.gallery} role="region">
      <div className="relative aspect-[4/5] overflow-hidden rounded-[1.75rem] bg-surface-2">
        <ProductImage
          src={current?.url}
          alt={current?.alt ?? name}
          slug={slug}
          category={category}
          sizes="(min-width: 1024px) 560px, 100vw"
          priority
        />
      </div>
      {images.length > 1 ? (
        <ul className="flex gap-2.5">
          {images.map((img, i) => (
            <li key={img.url}>
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={fmt(dict.product.showImage, { n: i + 1 })}
                aria-pressed={i === active}
                className={cn(
                  "relative block size-20 overflow-hidden rounded-xl border-2 bg-surface-2",
                  i === active ? "border-ink" : "border-transparent opacity-80 hover:opacity-100",
                )}
              >
                <ProductImage src={img.url} alt="" slug={slug} category={category} sizes="96px" showCoverName={false} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
