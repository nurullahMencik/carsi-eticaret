import { describe, expect, it } from "vitest";
import { expiryValid, luhnValid, maskCard } from "@/lib/domain/card";
import { generateOrderNumber } from "@/lib/domain/order-number";
import { buildSearchText, foldSearchText } from "@/lib/domain/search";
import { fmt, localized } from "@/lib/i18n";
import { en } from "@/lib/i18n/en";
import { tr } from "@/lib/i18n/tr";
import { bucketByDay, istanbulDayKey } from "@/lib/services/admin/dashboard";
import { slugify } from "@/lib/slugify";
import { buildListUrl } from "@/lib/url";

describe("search folding", () => {
  it("folds Turkish letters and case so İ/ı/ş searches match", () => {
    expect(foldSearchText("  İZNİK Çini  Tabağı ")).toBe("iznik cini tabagi");
    expect(foldSearchText("Işık")).toBe("isik");
    expect(buildSearchText(["Pamuklu Peştemal", null, "Cotton"])).toBe("pamuklu pestemal cotton");
  });
  it("slugifies product names", () => {
    expect(slugify("Dövme Bakır Cezve (2'li)")).toBe("dovme-bakir-cezve-2-li");
  });
});

describe("URL state for lists", () => {
  it("drops empty params and resets the page when filters change", () => {
    expect(buildListUrl("/urunler", { kategori: "kilim", sayfa: 3, q: "" }, { stok: true })).toBe("/urunler?kategori=kilim&stok=1");
    expect(buildListUrl("/urunler", { kategori: "kilim" }, { sayfa: 2 })).toBe("/urunler?kategori=kilim&sayfa=2");
    expect(buildListUrl("/urunler", { kategori: "kilim" }, { kategori: undefined })).toBe("/urunler");
    expect(buildListUrl("/urunler", {}, { sayfa: 1 })).toBe("/urunler");
  });
});

describe("cards", () => {
  it("validates Luhn, expiry and masks numbers", () => {
    expect(luhnValid("4766 6200 0000 0001")).toBe(true);
    expect(luhnValid("4766 6200 0000 0002")).toBe(false);
    expect(expiryValid("12/26", new Date("2026-11-03"))).toBe(true);
    expect(expiryValid("10/26", new Date("2026-11-03"))).toBe(false);
    expect(expiryValid("13/30")).toBe(false);
    expect(maskCard("5528790000000008")).toBe("552879******0008");
  });
});

describe("order numbers", () => {
  it("encode the date and use an unambiguous alphabet", () => {
    const n = generateOrderNumber(new Date("2026-11-03T10:00:00Z"), () => 0);
    expect(n).toBe("CRS-261103-AAAA");
    expect(generateOrderNumber(new Date())).toMatch(/^CRS-\d{6}-[A-HJ-NP-Z2-9]{4}$/);
  });
});

describe("dashboard day buckets (Europe/Istanbul)", () => {
  it("assigns late-evening UTC payments to the next Istanbul day", () => {
    expect(istanbulDayKey(new Date("2026-11-02T22:30:00Z"))).toBe("2026-11-03");
  });
  it("creates one bucket per day and sums revenue", () => {
    const now = new Date("2026-11-03T09:00:00Z");
    const points = bucketByDay(
      [
        { paidAt: new Date("2026-11-03T08:00:00Z"), total: 1000 },
        { paidAt: new Date("2026-11-02T22:30:00Z"), total: 500 },
        { paidAt: new Date("2026-11-02T10:00:00Z"), total: 250 },
        { paidAt: null, total: 999 },
        { paidAt: new Date("2026-08-01T10:00:00Z"), total: 999 },
      ],
      3,
      now,
    );
    expect(points).toEqual([
      { day: "2026-11-01", revenue: 0, orders: 0 },
      { day: "2026-11-02", revenue: 250, orders: 1 },
      { day: "2026-11-03", revenue: 1500, orders: 2 },
    ]);
  });
});

describe("i18n dictionaries", () => {
  it("have identical key sets in Turkish and English", () => {
    const keys = (o: object, prefix = ""): string[] =>
      Object.entries(o).flatMap(([k, v]) => (typeof v === "object" ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]));
    expect(keys(en).sort()).toEqual(keys(tr).sort());
  });
  it("formats placeholders and picks localised fields with fallback", () => {
    expect(fmt("Merhaba {name}, {n} ürün", { name: "Ayşe", n: 3 })).toBe("Merhaba Ayşe, 3 ürün");
    expect(localized({ nameTr: "Kupa", nameEn: "" }, "name", "en")).toBe("Kupa");
    expect(localized({ nameTr: "Kupa", nameEn: "Mug" }, "name", "en")).toBe("Mug");
  });
});
