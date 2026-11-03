import { describe, expect, it } from "vitest";
import { addressSchema, checkoutSchema } from "@/lib/validation/address";
import { loginSchema, registerSchema, safeCallbackUrl } from "@/lib/validation/auth";
import { addToCartSchema, couponCodeSchema } from "@/lib/validation/cart";
import { parseProductListQuery, productSchema } from "@/lib/validation/catalog";
import { fieldErrors } from "@/lib/validation/common";
import { couponSchema } from "@/lib/validation/coupon";
import { orderStatusUpdateSchema } from "@/lib/validation/order";
import { demoCardSchema } from "@/lib/validation/payment";
import { reviewSchema } from "@/lib/validation/review";

const errorsOf = (result: { success: boolean; error?: unknown }) =>
  result.success ? {} : fieldErrors(result.error as Parameters<typeof fieldErrors>[0]);

describe("auth schemas", () => {
  it("normalises e-mail and requires a password", () => {
    expect(loginSchema.parse({ email: "  Musteri@Carsi.Demo ", password: "x" }).email).toBe("musteri@carsi.demo");
    expect(errorsOf(loginSchema.safeParse({ email: "nope", password: "" }))).toEqual({ email: "email", password: "required" });
  });
  it("requires a strong password and matching confirmation", () => {
    expect(errorsOf(registerSchema.safeParse({ name: "Ada", email: "a@b.co", password: "abcdefgh", confirmPassword: "abcdefgh" }))).toEqual({ password: "passwordWeak" });
    expect(errorsOf(registerSchema.safeParse({ name: "Ada", email: "a@b.co", password: "Çarşı2026", confirmPassword: "x" }))).toEqual({ confirmPassword: "passwordMismatch" });
    expect(registerSchema.safeParse({ name: "Ada", email: "a@b.co", password: "Çarşı2026", confirmPassword: "Çarşı2026" }).success).toBe(true);
  });
  it("only accepts same-site relative callback URLs", () => {
    expect(safeCallbackUrl("/odeme")).toBe("/odeme");
    expect(safeCallbackUrl("https://evil.example")).toBe("/hesabim");
    expect(safeCallbackUrl("//evil.example")).toBe("/hesabim");
    expect(safeCallbackUrl("/\\evil.example")).toBe("/hesabim");
    expect(safeCallbackUrl(undefined, "/admin")).toBe("/admin");
  });
});

describe("address & checkout", () => {
  const valid = { title: "Ev", fullName: "Ayşe Yılmaz", phone: "0532 123 45 67", city: "İstanbul", district: "Kadıköy", line: "Moda Cad. No: 42 D: 5", postalCode: "34710" };
  it("accepts Turkish phone formats and strips separators", () => {
    expect(addressSchema.parse(valid).phone).toBe("05321234567");
    expect(addressSchema.parse({ ...valid, phone: "+90 (532) 123-45-67" }).phone).toBe("+905321234567");
    expect(addressSchema.parse({ ...valid, phone: "5321234567" }).phone).toBe("5321234567");
  });
  it("rejects bad phones, postcodes and short addresses", () => {
    expect(errorsOf(addressSchema.safeParse({ ...valid, phone: "12345", postalCode: "347", line: "kısa" }))).toEqual({
      phone: "phone",
      postalCode: "postalCode",
      line: "addressTooShort",
    });
  });
  it("needs either a saved address or a new one", () => {
    expect(errorsOf(checkoutSchema.safeParse({}))).toEqual({ addressId: "addressRequired" });
    expect(checkoutSchema.safeParse({ addressId: "abc" }).success).toBe(true);
    expect(checkoutSchema.safeParse({ newAddress: valid }).success).toBe(true);
  });
});

describe("cart, coupon code, review", () => {
  it("bounds quantities", () => {
    expect(addToCartSchema.safeParse({ variantId: "v1", quantity: 0 }).success).toBe(false);
    expect(addToCartSchema.safeParse({ variantId: "v1", quantity: 21 }).success).toBe(false);
    expect(addToCartSchema.parse({ variantId: "v1", quantity: "3" }).quantity).toBe(3);
  });
  it("accepts reasonable coupon codes only", () => {
    expect(couponCodeSchema.safeParse({ code: "HOSGELDIN10" }).success).toBe(true);
    expect(couponCodeSchema.safeParse({ code: "x" }).success).toBe(false);
    expect(couponCodeSchema.safeParse({ code: "DROP TABLE;" }).success).toBe(false);
  });
  it("validates reviews", () => {
    expect(errorsOf(reviewSchema.safeParse({ productId: "p", rating: 6, body: "kısa" }))).toEqual({ rating: "rating", body: "reviewTooShort" });
  });
});

describe("demo card", () => {
  const base = { orderNumber: "CRS-1", cardHolder: "AYŞE YILMAZ", cardNumber: "5528 7900 0000 0008", expiry: "12/30", cvc: "123" };
  it("strips spaces and checks Luhn, expiry and CVC", () => {
    expect(demoCardSchema.parse(base).cardNumber).toBe("5528790000000008");
    expect(errorsOf(demoCardSchema.safeParse({ ...base, cardNumber: "5528 7900 0000 0009", expiry: "01/20", cvc: "12" }))).toEqual({
      cardNumber: "cardNumber",
      expiry: "cardExpiry",
      cvc: "cvc",
    });
  });
});

describe("product list URL query", () => {
  it("parses valid params", () => {
    expect(parseProductListQuery({ q: " kupa ", kategori: "seramik", min: "100", max: "900", stok: "1", sirala: "fiyat-artan", sayfa: "2" })).toEqual({
      q: "kupa",
      kategori: "seramik",
      min: 100,
      max: 900,
      stok: true,
      sirala: "fiyat-artan",
      sayfa: 2,
    });
  });
  it("falls back to defaults for hand-edited garbage instead of throwing", () => {
    expect(parseProductListQuery({ kategori: "../etc", min: "-5", sirala: "en-iyi", sayfa: "abc", stok: "evet" })).toEqual({
      q: undefined,
      kategori: undefined,
      min: undefined,
      max: undefined,
      stok: false,
      sirala: undefined,
      sayfa: undefined,
    });
  });
  it("swaps an inverted price range", () => {
    expect(parseProductListQuery({ min: "900", max: "100" })).toMatchObject({ min: 100, max: 900 });
  });
});

describe("admin product schema", () => {
  const product = {
    slug: "yeni-kupa",
    categoryId: "c1",
    nameTr: "Yeni Kupa",
    nameEn: "New Mug",
    shortDescTr: "Kısa",
    shortDescEn: "Short",
    descriptionTr: "Yirmi karakterden uzun bir açıklama.",
    descriptionEn: "A description longer than twenty chars.",
    price: "450,50",
    compareAtPrice: "",
    vatRate: "20",
    images: ["/images/products/kupa-1.webp"],
    variants: [{ sku: "KUPA-1", stock: "5", priceDelta: "0" }],
  };
  it("converts lira inputs to kuruş", () => {
    const out = productSchema.parse(product);
    expect(out.price).toBe(45050);
    expect(out.compareAtPrice).toBeNull();
    expect(out.variants[0]).toMatchObject({ sku: "KUPA-1", stock: 5, priceDelta: 0, isActive: true });
  });
  it("rejects a compare-at price lower than the price, duplicate SKUs and bad slugs", () => {
    const errors = errorsOf(
      productSchema.safeParse({
        ...product,
        slug: "Yeni Kupa",
        compareAtPrice: "100",
        variants: [
          { sku: "A-1", stock: 1 },
          { sku: "A-1", stock: 1 },
        ],
      }),
    );
    expect(errors).toMatchObject({ slug: "slug", compareAtPrice: "compareAtPrice", "variants.1.sku": "skuDuplicate" });
  });
  it("requires at least one variant and only allows local or https images", () => {
    expect(errorsOf(productSchema.safeParse({ ...product, variants: [], images: ["javascript:alert(1)"] }))).toMatchObject({
      variants: "variantRequired",
      "images.0": "imageUrl",
    });
  });
});

describe("admin coupon schema", () => {
  it("normalises the code and converts fixed amounts to kuruş", () => {
    const out = couponSchema.parse({ code: "yılbaşı150", type: "FIXED", value: "150", minSubtotal: "1.500,00", isActive: true });
    expect(out.code).toBe("YILBASI150");
    expect(out.value).toBe(15000);
    expect(out.minSubtotal).toBe(150000);
  });
  it("validates percent range and date order", () => {
    expect(
      errorsOf(couponSchema.safeParse({ code: "OPS", type: "PERCENT", value: 150, startsAt: "2026-12-01", endsAt: "2026-11-01" })),
    ).toMatchObject({ value: "percentRange", endsAt: "dateRange" });
  });
});

describe("order status update", () => {
  it("requires carrier and tracking number when shipping", () => {
    expect(errorsOf(orderStatusUpdateSchema.safeParse({ orderId: "o1", toStatus: "SHIPPED" }))).toEqual({ carrier: "required", trackingNumber: "trackingNumber" });
    expect(orderStatusUpdateSchema.safeParse({ orderId: "o1", toStatus: "SHIPPED", carrier: "Aras Kargo", trackingNumber: "ARS123456" }).success).toBe(true);
    expect(orderStatusUpdateSchema.safeParse({ orderId: "o1", toStatus: "LOST" }).success).toBe(false);
  });
});
