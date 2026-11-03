import { describe, expect, it } from "vitest";
import { decimalStringToKurus, formatTRY, formatTRYCompact, kurusToDecimalString, parseLiraToKurus } from "@/lib/domain/money";
import { netFromGross, vatBreakdown, vatFromGross } from "@/lib/domain/vat";

describe("money formatting (tr-TR, TRY)", () => {
  it("formats kuruş as Turkish lira with thousands dots and decimal comma", () => {
    expect(formatTRY(123456)).toBe("₺1.234,56");
    expect(formatTRY(45000)).toBe("₺450,00");
    expect(formatTRY(0)).toBe("₺0,00");
  });

  it("compact format drops ,00 only for whole liras", () => {
    expect(formatTRYCompact(75000)).toBe("₺750");
    expect(formatTRYCompact(7990)).toBe("₺79,90");
  });

  it("converts to and from gateway decimal strings", () => {
    expect(kurusToDecimalString(123456)).toBe("1234.56");
    expect(kurusToDecimalString(5)).toBe("0.05");
    expect(decimalStringToKurus("1234.5")).toBe(123450);
    expect(decimalStringToKurus(1.2)).toBe(120);
    expect(() => kurusToDecimalString(1.5)).toThrow();
  });

  it("parses lira input in Turkish and plain formats", () => {
    expect(parseLiraToKurus("1.234,50")).toBe(123450);
    expect(parseLiraToKurus("1234,5")).toBe(123450);
    expect(parseLiraToKurus("1234.50")).toBe(123450);
    expect(parseLiraToKurus("₺ 750")).toBe(75000);
    expect(parseLiraToKurus(19.99)).toBe(1999);
    expect(parseLiraToKurus("12,345")).toBeNaN();
    expect(parseLiraToKurus("abc")).toBeNaN();
    expect(parseLiraToKurus("")).toBeNaN();
  });
});

describe("VAT (KDV dahil fiyatlar)", () => {
  it("extracts VAT from a VAT-inclusive amount", () => {
    expect(vatFromGross(12000, 20)).toBe(2000); // 120 TL incl. 20% -> 20 TL VAT
    expect(vatFromGross(11000, 10)).toBe(1000);
    expect(vatFromGross(10100, 1)).toBe(100);
    expect(netFromGross(12000, 20)).toBe(10000);
    expect(vatFromGross(5000, 0)).toBe(0);
  });

  it("rounds to the nearest kuruş", () => {
    // 45000 * 20 / 120 = 7500 exactly; 39000 * 10 / 110 = 3545.45...
    expect(vatFromGross(45000, 20)).toBe(7500);
    expect(vatFromGross(39000, 10)).toBe(3545);
  });

  it("groups mixed rates", () => {
    const rows = vatBreakdown([
      { gross: 12000, rate: 20 },
      { gross: 11000, rate: 10 },
      { gross: 6000, rate: 20 },
    ]);
    expect(rows).toEqual([
      { rate: 10, gross: 11000, vat: 1000, net: 10000 },
      { rate: 20, gross: 18000, vat: 3000, net: 15000 },
    ]);
  });
});
