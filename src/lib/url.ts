/**
 * Builds a list URL from the current params plus overrides. `undefined`, `""`, `false`
 * and `null` remove a param; changing any filter resets pagination unless `sayfa` is given.
 */
export function buildListUrl(
  pathname: string,
  current: Record<string, string | number | boolean | undefined | null>,
  overrides: Record<string, string | number | boolean | undefined | null> = {},
): string {
  const merged: Record<string, string | number | boolean | undefined | null> = { ...current, ...overrides };
  if (!("sayfa" in overrides)) delete merged.sayfa;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (value === undefined || value === null || value === "" || value === false) continue;
    if (key === "sayfa" && Number(value) <= 1) continue;
    params.set(key, value === true ? "1" : String(value));
  }
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}
