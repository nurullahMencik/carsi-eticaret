/** VAT helpers. Prices are VAT-inclusive (KDV dahil). */

export const VAT_RATES = [1, 10, 20] as const;
export type VatRate = (typeof VAT_RATES)[number];

/** Rate applied to the shipping fee. */
export const SHIPPING_VAT_RATE = 20;

/** VAT contained in a VAT-inclusive amount, rounded to the nearest kuruş. */
export function vatFromGross(gross: number, ratePercent: number): number {
  if (ratePercent <= 0) return 0;
  return Math.round((gross * ratePercent) / (100 + ratePercent));
}

export function netFromGross(gross: number, ratePercent: number): number {
  return gross - vatFromGross(gross, ratePercent);
}

export type VatLine = { gross: number; rate: number };

/** Groups VAT-inclusive amounts by rate: [{ rate, net, vat, gross }]. */
export function vatBreakdown(lines: VatLine[]) {
  const byRate = new Map<number, number>();
  for (const line of lines) byRate.set(line.rate, (byRate.get(line.rate) ?? 0) + line.gross);
  return [...byRate.entries()]
    .sort(([a], [b]) => a - b)
    .map(([rate, gross]) => {
      const vat = vatFromGross(gross, rate);
      return { rate, gross, vat, net: gross - vat };
    });
}
