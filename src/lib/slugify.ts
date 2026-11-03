import { foldSearchText } from "@/lib/domain/search";

export function slugify(input: string): string {
  return foldSearchText(input)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
