/**
 * Money helpers. All amounts in the app are integers in kuruş (1 TRY = 100 kuruş)
 * and include VAT. Prices are always displayed in the tr-TR format, whatever the UI language.
 */

const tryFormatter = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const tryFormatterWhole = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** 123456 -> "₺1.234,56" */
export function formatTRY(kurus: number): string {
  return tryFormatter.format(kurus / 100);
}

/** Drops ",00" for whole liras: 75000 -> "₺750", 7990 -> "₺79,90". */
export function formatTRYCompact(kurus: number): string {
  return kurus % 100 === 0 ? tryFormatterWhole.format(kurus / 100) : formatTRY(kurus);
}

/** 123456 -> "1234.56" (the decimal string format payment gateways expect). */
export function kurusToDecimalString(kurus: number): string {
  if (!Number.isInteger(kurus)) throw new TypeError("Amount must be an integer number of kuruş");
  const sign = kurus < 0 ? "-" : "";
  const abs = Math.abs(kurus);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

/**
 * Parses a lira amount into kuruş. Accepts numbers, "1234.5", "1234,50" and "1.234,50".
 * Returns NaN for anything else.
 */
export function parseLiraToKurus(input: string | number): number {
  if (typeof input === "number") {
    return Number.isFinite(input) ? Math.round(input * 100) : Number.NaN;
  }
  let s = input.trim().replace(/\s|₺|TL/gi, "");
  if (s === "") return Number.NaN;
  if (s.includes(",")) {
    // Turkish format: "." thousands separator, "," decimal separator.
    s = s.replace(/\./g, "").replace(",", ".");
  }
  if (!/^-?\d+(\.\d{1,2})?$/.test(s)) return Number.NaN;
  return Math.round(Number(s) * 100);
}

/** Amount strings coming from gateways ("1.2", "1.20", "1") -> kuruş. */
export function decimalStringToKurus(value: string | number): number {
  return parseLiraToKurus(typeof value === "number" ? value : String(value));
}
