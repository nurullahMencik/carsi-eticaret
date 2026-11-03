"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/components/ui/cn";
import { ProductCover } from "./product-cover";

/**
 * Product photo with a guaranteed fallback: no image, or one that fails to load,
 * renders the generated cover instead of a broken image.
 */
export function ProductImage({
  src,
  alt,
  slug,
  category,
  sizes,
  priority = false,
  className,
  showCoverName = true,
}: {
  src: string | null | undefined;
  alt: string;
  slug: string;
  category: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  showCoverName?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return <ProductCover slug={slug} name={alt} category={category} showName={showCoverName} className={className} />;
  }
  const external = /^https?:\/\//.test(src);
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      fetchPriority={priority ? "high" : undefined}
      unoptimized={external}
      quality={70}
      className={cn("object-cover", className)}
      onError={() => setFailed(true)}
    />
  );
}
