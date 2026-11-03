"use client";

import dynamic from "next/dynamic";

/** The review form (react-hook-form + zod) is only downloaded for customers who may review. */
export const ReviewFormLazy = dynamic(() => import("./review-form").then((m) => m.ReviewForm), {
  loading: () => <div className="h-72 animate-pulse rounded-2xl bg-surface-2" aria-hidden />,
});
