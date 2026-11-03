/**
 * Portable, case-insensitive search: we store a folded copy of the searchable text
 * and fold queries the same way, so it works the same on SQLite and PostgreSQL
 * (SQLite's LIKE only folds ASCII, and Turkish İ/ı need locale-aware lower-casing).
 */
const FOLD: Record<string, string> = { ç: "c", ğ: "g", ı: "i", i: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i", û: "u" };

export function foldSearchText(input: string): string {
  return input
    .toLocaleLowerCase("tr-TR")
    .normalize("NFC")
    .replace(/[çğıöşüâîû]/g, (ch) => FOLD[ch] ?? ch)
    .replace(/\s+/g, " ")
    .trim();
}

export function buildSearchText(parts: Array<string | null | undefined>): string {
  return foldSearchText(parts.filter(Boolean).join(" "));
}
