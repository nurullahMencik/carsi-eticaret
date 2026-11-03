/**
 * Seeds the demo store: 6 categories, 40 products with variants, 3 coupons, demo accounts,
 * ~150 orders spread over the last 60 days (with status histories) and reviews from buyers.
 * Deterministic (seeded PRNG) and idempotent: it wipes the data first.
 *
 *   npx prisma db seed            (or: npx tsx prisma/seed.ts)
 */
import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import { createPrismaClient } from "../src/lib/db";
import { generateOrderNumber } from "../src/lib/domain/order-number";
import { calculateTotals } from "../src/lib/domain/pricing";
import { buildSearchText } from "../src/lib/domain/search";
import type { CouponRule } from "../src/lib/domain/coupon";
import { categories, products, type CatalogProduct, type CatalogVariant } from "./data/catalog";

const db = createPrismaClient();
const DAY = 86_400_000;
const NOW = new Date();

// ---------------------------------------------------------------- deterministic randomness
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261102);
const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)]!;
const chance = (p: number) => rand() < p;
function weightedPick<T>(items: readonly T[], weight: (t: T) => number): T {
  const total = items.reduce((a, t) => a + weight(t), 0);
  let r = rand() * total;
  for (const item of items) {
    r -= weight(item);
    if (r <= 0) return item;
  }
  return items.at(-1)!;
}

// ---------------------------------------------------------------- images
type Credit = { path: string; kind: string; slug: string; width: number; height: number };
function loadCredits(): Credit[] {
  const file = path.join(process.cwd(), "src/data/image-credits.json");
  try {
    const json = JSON.parse(fs.readFileSync(file, "utf8")) as { images: Credit[] };
    return json.images.filter((c) => fs.existsSync(path.join(process.cwd(), "public", c.path)));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------- people
const CUSTOMER_NAMES = [
  "Elif Kaya", "Mehmet Demir", "Zeynep Çelik", "Can Şahin", "Deniz Arslan", "Burak Öztürk", "Selin Aydın",
  "Emre Koç", "Gizem Yıldız", "Mert Kılıç", "Ece Doğan", "Oğuz Aksoy", "Derya Polat", "Kerem Erdoğan",
  "Melis Güneş", "Barış Kurt", "İrem Özdemir", "Tolga Çakır", "Pınar Yavuz", "Serkan Taş", "Nazlı Uçar",
  "Onur Bulut", "Büşra Ateş", "Hakan Korkmaz",
];
const PLACES = [
  { city: "İstanbul", districts: ["Kadıköy", "Beşiktaş", "Üsküdar", "Şişli", "Bakırköy"] },
  { city: "Ankara", districts: ["Çankaya", "Yenimahalle", "Keçiören"] },
  { city: "İzmir", districts: ["Karşıyaka", "Bornova", "Konak", "Urla"] },
  { city: "Bursa", districts: ["Nilüfer", "Osmangazi"] },
  { city: "Eskişehir", districts: ["Tepebaşı", "Odunpazarı"] },
  { city: "Antalya", districts: ["Muratpaşa", "Konyaaltı"] },
];
const STREETS = ["Bahariye Cad.", "Atatürk Bulvarı", "Kordon Boyu", "Gül Sok.", "Çamlık Sok.", "Cumhuriyet Cad.", "Lale Sok.", "Kavaklı Sok."];

function asciiFold(s: string) {
  return s
    .toLocaleLowerCase("tr-TR")
    .replace(/[çğıöşü]/g, (c) => ({ ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u" })[c]!);
}

function fakeAddress(fullName: string, title = "Ev") {
  const place = pick(PLACES);
  return {
    title,
    fullName,
    phone: `05${int(30, 55)}${int(100, 999)}${int(10, 99)}${int(10, 99)}`,
    city: place.city,
    district: pick(place.districts),
    line: `${pick(STREETS)} No: ${int(1, 140)} D: ${int(1, 24)}`,
    postalCode: String(int(10000, 81999)),
  };
}

// ---------------------------------------------------------------- reviews
const REVIEW_POOL: Record<number, Array<{ title: string; body: string }>> = {
  5: [
    { title: "Fotoğraftakinden daha güzel", body: "Fotoğraflardaki gibi, hatta daha güzel. Paketleme çok özenliydi, tek bir çizik bile yoktu." },
    { title: "Kaliteli işçilik", body: "El yapımı olduğu her detayından belli. Uzun süre kullanacağım bir parça oldu." },
    { title: "Hediye için harika", body: "Anneme hediye olarak aldım, çok beğenildi. Yanında gelen not kartı da hoş bir sürprizdi." },
    { title: "Tekrar alırım", body: "Kargo hızlıydı, ürün sapasağlam geldi. Bir tane daha sipariş vermeyi düşünüyorum." },
    { title: "Tam aradığım gibi", body: "Rengi ve dokusu tam aradığım gibiydi. Evdeki diğer parçalarla çok güzel uyum sağladı." },
    { title: "Çok memnunum", body: "Günlük kullanımda çok memnunum, her gün elim ona gidiyor. Kesinlikle tavsiye ederim." },
  ],
  4: [
    { title: "Güzel ama renk biraz farklı", body: "Renk ekranda gördüğümden biraz daha koyu ama yine de çok şık duruyor. Kalitesi iyi." },
    { title: "Fiyatına değer", body: "Fiyatına göre gayet iyi. Kargo bir gün gecikti ama ürün özenle paketlenmişti." },
    { title: "Beğendim", body: "Beklentimi karşıladı. El yapımı olduğu için ufak tefek farklar var, bu da ayrı bir güzellik katıyor." },
  ],
  3: [
    { title: "Beklediğimden küçük", body: "Beklediğimden küçük çıktı, ölçülere dikkat etmek lazım. Onun dışında işçilik güzel." },
    { title: "Fena değil", body: "Ürün güzel ama kargoda kutusu biraz ezilmişti. Neyse ki ürüne bir şey olmamış." },
  ],
};

function reviewFor(): { rating: number; title: string; body: string } {
  const rating = weightedPick([5, 4, 3], (r) => (r === 5 ? 62 : r === 4 ? 30 : 8));
  return { rating, ...pick(REVIEW_POOL[rating]!) };
}

// ---------------------------------------------------------------- catalogue helpers
const CATEGORY_CODES: Record<string, string> = {
  seramik: "SER",
  cini: "CIN",
  tekstil: "TEK",
  kilim: "KLM",
  aydinlatma: "AYD",
  "bakir-ahsap": "BKR",
};

function variantCode(v: CatalogVariant): string {
  const color = v.colorTr ? asciiFold(v.colorTr).replace(/[^a-z]/g, "").slice(0, 3).toUpperCase() : "";
  const size = v.size ? v.size.replace(/[^0-9]/g, "").slice(0, 6) : "";
  return [color, size].filter(Boolean).join("") || "STD";
}

function variantLabelTr(v: CatalogVariant) {
  return [v.colorTr, v.size].filter(Boolean).join(" · ");
}

async function wipe() {
  // Children first.
  await db.auditLog.deleteMany();
  await db.emailLog.deleteMany();
  await db.paymentAttempt.deleteMany();
  await db.orderStatusEvent.deleteMany();
  await db.orderItem.deleteMany();
  await db.order.deleteMany();
  await db.review.deleteMany();
  await db.cartItem.deleteMany();
  await db.cart.deleteMany();
  await db.coupon.deleteMany();
  await db.productImage.deleteMany();
  await db.productVariant.deleteMany();
  await db.product.deleteMany();
  await db.category.deleteMany();
  await db.address.deleteMany();
  await db.user.deleteMany();
}

async function main() {
  const started = Date.now();
  await wipe();
  const credits = loadCredits();
  const passwordHash = await bcrypt.hash("Demo123!", 11);

  // ------------------------------------------------------------ users
  const admin = await db.user.create({
    data: { email: "admin@carsi.demo", name: "Nurullah Mencik", role: "ADMIN", passwordHash, createdAt: new Date(NOW.getTime() - 200 * DAY) },
  });
  const staff = await db.user.create({
    data: { email: "personel@carsi.demo", name: "Seda Karaca", role: "STAFF", passwordHash, createdAt: new Date(NOW.getTime() - 180 * DAY) },
  });
  const demoCustomer = await db.user.create({
    data: {
      email: "musteri@carsi.demo",
      name: "Ayşe Yılmaz",
      role: "CUSTOMER",
      passwordHash,
      phone: "05321234567",
      createdAt: new Date(NOW.getTime() - 120 * DAY),
      addresses: {
        create: [
          {
            title: "Ev",
            fullName: "Ayşe Yılmaz",
            phone: "05321234567",
            city: "İstanbul",
            district: "Kadıköy",
            line: "Moda Cad. No: 42 D: 5, Caferağa Mah.",
            postalCode: "34710",
            isDefault: true,
          },
          {
            title: "İş",
            fullName: "Ayşe Yılmaz",
            phone: "05321234567",
            city: "İstanbul",
            district: "Şişli",
            line: "Büyükdere Cad. No: 120 Kat: 8, Esentepe Mah.",
            postalCode: "34394",
          },
        ],
      },
    },
  });
  const customers = [demoCustomer];
  for (const [i, name] of CUSTOMER_NAMES.entries()) {
    const [first, last] = name.split(" ");
    customers.push(
      await db.user.create({
        data: {
          email: `${asciiFold(first!)}.${asciiFold(last!)}@ornek.demo`,
          name,
          role: "CUSTOMER",
          passwordHash,
          createdAt: new Date(NOW.getTime() - (150 - i * 4) * DAY),
          addresses: { create: [{ ...fakeAddress(name), isDefault: true }] },
        },
        include: { addresses: true },
      }),
    );
  }
  const addresses = await db.address.findMany();

  // ------------------------------------------------------------ catalogue
  const categoryIds = new Map<string, string>();
  for (const [i, c] of categories.entries()) {
    const image = credits.find((cr) => cr.kind === "category" && cr.slug === c.slug);
    const row = await db.category.create({ data: { ...c, sortOrder: i, imageUrl: image?.path ?? null } });
    categoryIds.set(c.slug, row.id);
  }

  type SeededVariant = { id: string; sku: string; productId: string; unitPrice: number; vatRate: number; label: string; p: CatalogProduct; image: string | null };
  const seededVariants: SeededVariant[] = [];
  const productIdBySlug = new Map<string, string>();
  const usedSkus = new Set<string>();

  for (const [i, p] of products.entries()) {
    const vatRate = p.category === "tekstil" || p.category === "kilim" ? 10 : 20;
    const images = credits
      .filter((cr) => cr.kind === "product" && cr.slug === p.slug)
      .sort((a, b) => a.path.localeCompare(b.path));
    const createdAt = new Date(NOW.getTime() - (130 - i * 3) * DAY - int(0, 20) * 3600 * 1000);
    const skus = p.variants.map((v) => {
      let sku = `${CATEGORY_CODES[p.category]}-${String(i + 1).padStart(3, "0")}-${variantCode(v)}`;
      while (usedSkus.has(sku)) sku += "X";
      usedSkus.add(sku);
      return sku;
    });
    const product = await db.product.create({
      data: {
        slug: p.slug,
        categoryId: categoryIds.get(p.category)!,
        nameTr: p.nameTr,
        nameEn: p.nameEn,
        shortDescTr: p.shortTr,
        shortDescEn: p.shortEn,
        descriptionTr: p.descTr,
        descriptionEn: p.descEn,
        price: p.price,
        compareAtPrice: p.compareAt ?? null,
        vatRate,
        isFeatured: p.featured ?? false,
        searchText: buildSearchText([
          p.nameTr,
          p.nameEn,
          p.shortTr,
          p.shortEn,
          ...p.variants.flatMap((v) => [v.colorTr, v.colorEn, v.size]),
          ...skus,
        ]),
        createdAt,
        images: {
          create: images.map((img, idx) => ({ url: img.path, altTr: p.nameTr, altEn: p.nameEn, sortOrder: idx })),
        },
        variants: {
          create: p.variants.map((v, idx) => ({
            sku: skus[idx]!,
            colorTr: v.colorTr ?? null,
            colorEn: v.colorEn ?? null,
            colorHex: v.colorHex ?? null,
            size: v.size ?? null,
            priceDelta: v.priceDelta ?? 0,
            stock: v.stock,
            sortOrder: idx,
          })),
        },
      },
      include: { variants: { orderBy: { sortOrder: "asc" } } },
    });
    productIdBySlug.set(p.slug, product.id);
    product.variants.forEach((v, idx) => {
      seededVariants.push({
        id: v.id,
        sku: v.sku,
        productId: product.id,
        unitPrice: p.price + v.priceDelta,
        vatRate,
        label: variantLabelTr(p.variants[idx]!),
        p,
        image: images[0]?.path ?? null,
      });
    });
  }

  // ------------------------------------------------------------ coupons
  const couponDefs = [
    {
      code: "HOSGELDIN10",
      type: "PERCENT",
      value: 10,
      minSubtotal: 25_000,
      maxDiscount: 50_000,
      startsAt: new Date(NOW.getTime() - 90 * DAY),
      endsAt: null,
      usageLimit: null,
      descriptionTr: "İlk siparişe %10 indirim (en fazla 500 ₺).",
      descriptionEn: "10% off your first order (up to ₺500).",
    },
    {
      code: "CARSI150",
      type: "FIXED",
      value: 15_000,
      minSubtotal: 150_000,
      maxDiscount: null,
      startsAt: new Date(NOW.getTime() - 45 * DAY),
      endsAt: new Date(NOW.getTime() + 45 * DAY),
      usageLimit: 200,
      descriptionTr: "1.500 ₺ ve üzeri siparişlerde 150 ₺ indirim.",
      descriptionEn: "₺150 off orders of ₺1,500 or more.",
    },
    {
      code: "YAZ25",
      type: "PERCENT",
      value: 25,
      minSubtotal: 50_000,
      maxDiscount: 75_000,
      startsAt: new Date(NOW.getTime() - 150 * DAY),
      endsAt: new Date(NOW.getTime() - 32 * DAY),
      usageLimit: 100,
      descriptionTr: "Yaz kampanyası (sona erdi).",
      descriptionEn: "Summer campaign (ended).",
    },
  ] as const;
  for (const c of couponDefs) await db.coupon.create({ data: { ...c, isActive: true } });
  const couponRules = new Map<string, CouponRule>(couponDefs.map((c) => [c.code, { ...c, usedCount: 0, isActive: true }]));
  const couponUses = new Map<string, number>();

  // ------------------------------------------------------------ orders
  const popularity = (v: SeededVariant) =>
    (v.p.featured ? 3 : 1) * (v.p.price < 60_000 ? 3 : v.p.price < 150_000 ? 2 : 0.7) / Math.max(1, v.p.variants.length * 0.6);
  const ORDER_COUNT = 152;
  type Plan = { createdAt: Date; status: string; failed?: boolean };
  const plans: Plan[] = [];
  for (let n = 0; n < ORDER_COUNT; n++) {
    // Skew towards recent days (gentle growth trend) and weekends.
    let ageDays: number;
    do {
      ageDays = Math.floor(Math.pow(rand(), 1.25) * 60);
    } while ([0, 6].includes(new Date(NOW.getTime() - ageDays * DAY).getDay()) ? false : chance(0.12));
    const createdAt = new Date(NOW.getTime() - ageDays * DAY - int(0, 14) * 3600 * 1000 - int(0, 59) * 60 * 1000);
    if (createdAt > NOW) continue;
    let status: string;
    if (ageDays > 10) status = weightedPick(["DELIVERED", "CANCELLED", "REFUNDED"], (s) => (s === "DELIVERED" ? 91 : s === "CANCELLED" ? 5 : 4));
    else if (ageDays > 5) status = weightedPick(["DELIVERED", "SHIPPED", "CANCELLED"], (s) => (s === "DELIVERED" ? 64 : s === "SHIPPED" ? 32 : 4));
    else if (ageDays > 1) status = weightedPick(["SHIPPED", "PREPARING", "DELIVERED"], (s) => (s === "SHIPPED" ? 45 : s === "PREPARING" ? 35 : 20));
    else status = weightedPick(["PAID", "PREPARING", "PENDING"], (s) => (s === "PAID" ? 55 : s === "PREPARING" ? 30 : 15));
    plans.push({ createdAt, status, failed: status === "PENDING" && chance(0.6) });
  }
  // A few unpaid orders (two with a declined card) so the pending/failed states are visible too.
  plans.push(
    { createdAt: new Date(NOW.getTime() - 3 * 3600 * 1000), status: "PENDING", failed: true },
    { createdAt: new Date(NOW.getTime() - 20 * 3600 * 1000), status: "PENDING", failed: true },
    { createdAt: new Date(NOW.getTime() - 30 * 3600 * 1000), status: "PENDING", failed: false },
  );
  plans.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  // Guarantee a rich history for the demo customer: delivered (reviewable), shipped, preparing.
  const demoPlans: Plan[] = [
    { createdAt: new Date(NOW.getTime() - 41 * DAY), status: "DELIVERED" },
    { createdAt: new Date(NOW.getTime() - 18 * DAY), status: "DELIVERED" },
    { createdAt: new Date(NOW.getTime() - 4 * DAY), status: "SHIPPED" },
    { createdAt: new Date(NOW.getTime() - 1 * DAY - 5 * 3600 * 1000), status: "PREPARING" },
  ];

  const deliveredItems: Array<{ userId: string; productId: string; deliveredAt: Date }> = [];
  const soldCounts = new Map<string, number>();
  let orderCount = 0;
  const carriers = ["Yurtiçi Kargo", "Aras Kargo", "MNG Kargo", "PTT Kargo"];
  const usedNumbers = new Set<string>();

  async function createOrder(plan: Plan, user: (typeof customers)[number], forceProducts?: string[]) {
    const userAddresses = addresses.filter((a) => a.userId === user.id);
    const address = userAddresses.find((a) => a.isDefault) ?? userAddresses[0]!;
    const lineCount = forceProducts ? forceProducts.length : weightedPick([1, 2, 3, 4], (k) => [46, 32, 15, 7][k - 1]!);
    const chosen = new Map<string, { v: SeededVariant; qty: number }>();
    if (forceProducts) {
      for (const slug of forceProducts) {
        const v = seededVariants.find((sv) => sv.p.slug === slug)!;
        chosen.set(v.id, { v, qty: 1 });
      }
    } else {
      while (chosen.size < lineCount) {
        const v = weightedPick(seededVariants, popularity);
        if (!chosen.has(v.id)) chosen.set(v.id, { v, qty: v.p.price < 50_000 && chance(0.35) ? 2 : 1 });
      }
    }
    const lines = [...chosen.values()];
    const priced = lines.map((l) => ({ unitPrice: l.v.unitPrice, quantity: l.qty, vatRate: l.v.vatRate }));
    const subtotal = priced.reduce((a, l) => a + l.unitPrice * l.quantity, 0);

    // Coupons: HOSGELDIN10 on some first orders, CARSI150 on big baskets, YAZ25 before it expired.
    let coupon: CouponRule | null = null;
    const ageDays = (NOW.getTime() - plan.createdAt.getTime()) / DAY;
    if (subtotal >= 150_000 && ageDays < 45 && chance(0.3)) coupon = couponRules.get("CARSI150")!;
    else if (ageDays > 32 && subtotal >= 50_000 && chance(0.25)) coupon = couponRules.get("YAZ25")!;
    else if (subtotal >= 25_000 && chance(0.12)) coupon = couponRules.get("HOSGELDIN10")!;
    const totals = calculateTotals(priced, coupon, plan.createdAt);
    const couponCode = totals.coupon?.ok ? totals.coupon.code : null;
    if (couponCode && plan.status !== "PENDING") couponUses.set(couponCode, (couponUses.get(couponCode) ?? 0) + 1);

    // Timeline
    const t0 = plan.createdAt.getTime();
    const flow = ["PENDING", "PAID", "PREPARING", "SHIPPED", "DELIVERED"];
    let path: string[];
    if (plan.status === "CANCELLED") path = chance(0.5) ? ["PENDING", "CANCELLED"] : ["PENDING", "PAID", "CANCELLED"];
    else if (plan.status === "REFUNDED") path = [...flow, "REFUNDED"];
    else path = flow.slice(0, flow.indexOf(plan.status) + 1);
    const offsets: Record<string, number> = {
      PENDING: 0,
      PAID: int(1, 4) * 60 * 1000,
      PREPARING: int(3, 20) * 3600 * 1000,
      SHIPPED: int(24, 40) * 3600 * 1000,
      DELIVERED: int(60, 110) * 3600 * 1000,
      CANCELLED: int(1, 30) * 3600 * 1000,
      REFUNDED: int(7, 9) * DAY,
    };
    const at = (s: string) => new Date(Math.min(t0 + offsets[s]!, NOW.getTime() - 60_000));
    const paid = path.includes("PAID");
    const final = path.at(-1)!;
    const paymentRef = paid ? `demo_seed_${orderCount.toString(36)}${int(1000, 9999)}` : null;
    let number = generateOrderNumber(plan.createdAt, rand);
    while (usedNumbers.has(number)) number = generateOrderNumber(plan.createdAt, rand);
    usedNumbers.add(number);

    const events = path.map((s, idx) => {
      const actor =
        s === "PENDING" ? { actorId: user.id, actorRole: "CUSTOMER" } :
        s === "PAID" ? { actorId: null, actorRole: "SYSTEM" } :
        s === "REFUNDED" ? { actorId: admin.id, actorRole: "ADMIN" } :
        s === "CANCELLED" && !paid ? { actorId: user.id, actorRole: "CUSTOMER" } :
        chance(0.75) ? { actorId: staff.id, actorRole: "STAFF" } : { actorId: admin.id, actorRole: "ADMIN" };
      return {
        fromStatus: idx === 0 ? null : path[idx - 1]!,
        toStatus: s,
        ...actor,
        note: s === "PAID" ? "DEMO" : s === "REFUNDED" ? "Müşteri iadesi: ürün beğenilmedi" : s === "CANCELLED" ? "Müşteri talebiyle iptal" : null,
        createdAt: at(s),
      };
    });
    const shipped = path.includes("SHIPPED");
    const order = await db.order.create({
      data: {
        number,
        userId: user.id,
        email: user.email,
        status: final,
        paymentStatus: final === "REFUNDED" || (final === "CANCELLED" && paid) ? "REFUNDED" : paid ? "PAID" : plan.failed ? "FAILED" : "UNPAID",
        paymentProvider: "DEMO",
        isDemoPayment: true,
        paymentRef,
        shipFullName: address.fullName,
        shipPhone: address.phone,
        shipCity: address.city,
        shipDistrict: address.district,
        shipLine: address.line,
        shipPostalCode: address.postalCode,
        subtotal: totals.subtotal,
        discount: totals.discount,
        shippingFee: totals.shippingFee,
        total: totals.total,
        vatTotal: totals.vatTotal,
        couponCode,
        carrier: shipped ? pick(carriers) : null,
        trackingNumber: shipped ? `${int(100, 999)}${int(100000, 999999)}${int(10, 99)}` : null,
        locale: "tr",
        createdAt: plan.createdAt,
        updatedAt: at(final),
        paidAt: paid ? at("PAID") : null,
        shippedAt: shipped ? at("SHIPPED") : null,
        deliveredAt: path.includes("DELIVERED") ? at("DELIVERED") : null,
        cancelledAt: final === "CANCELLED" ? at("CANCELLED") : null,
        items: {
          create: lines.map((l) => ({
            productId: l.v.productId,
            variantId: l.v.id,
            productNameTr: l.v.p.nameTr,
            productNameEn: l.v.p.nameEn,
            variantLabel: l.v.label,
            sku: l.v.sku,
            imageUrl: l.v.image,
            unitPrice: l.v.unitPrice,
            quantity: l.qty,
            vatRate: l.v.vatRate,
            lineTotal: l.v.unitPrice * l.qty,
          })),
        },
        events: { create: events },
        payments: {
          create: [
            ...(plan.failed && !paid
              ? [{ provider: "DEMO", status: "FAILED", amount: totals.total, errorCode: "INSUFFICIENT_FUNDS", errorMessage: "INSUFFICIENT_FUNDS", createdAt: at("PENDING") }]
              : []),
            ...(paid ? [{ provider: "DEMO", status: "SUCCEEDED", amount: totals.total, providerRef: paymentRef, createdAt: at("PAID") }] : []),
            ...(paid && (final === "REFUNDED" || final === "CANCELLED")
              ? [{ provider: "DEMO", status: "REFUNDED", amount: totals.total, providerRef: `demo_refund_${int(10000, 99999)}`, createdAt: at(final) }]
              : []),
          ],
        },
      },
    });
    // Audit entries for staff/admin status changes.
    for (const e of events) {
      if (e.actorRole === "STAFF" || e.actorRole === "ADMIN") {
        const actorUser = e.actorRole === "STAFF" ? staff : admin;
        await db.auditLog.create({
          data: {
            actorId: actorUser.id,
            actorEmail: actorUser.email,
            action: "order.status",
            entityType: "Order",
            entityId: order.id,
            summary: `${number}: ${e.fromStatus} → ${e.toStatus}`,
            changes: JSON.stringify({ before: { status: e.fromStatus }, after: { status: e.toStatus } }),
            createdAt: e.createdAt,
          },
        });
      }
    }
    if (["PAID", "PREPARING", "SHIPPED", "DELIVERED"].includes(final)) {
      for (const l of lines) soldCounts.set(l.v.productId, (soldCounts.get(l.v.productId) ?? 0) + l.qty);
    }
    if (final === "DELIVERED") {
      for (const l of lines) deliveredItems.push({ userId: user.id, productId: l.v.productId, deliveredAt: at("DELIVERED") });
    }
    orderCount++;
  }

  const otherCustomers = customers.slice(1);
  for (const plan of plans) await createOrder(plan, weightedPick(otherCustomers, (c) => 1 + (c.email.length % 4)));
  await createOrder(demoPlans[0]!, demoCustomer, ["sirli-el-yapimi-kupa", "pamuklu-pestemal"]);
  await createOrder(demoPlans[1]!, demoCustomer, ["dovme-bakir-cezve", "iznik-desenli-cini-tabak"]);
  await createOrder(demoPlans[2]!, demoCustomer, ["mozaik-cam-masa-lambasi"]);
  await createOrder(demoPlans[3]!, demoCustomer, ["keten-masa-ortusu", "kutahya-cini-kase"]);

  // ------------------------------------------------------------ reviews (only from buyers of delivered orders)
  const reviewed = new Set<string>();
  // Leave İznik plate + cezve unreviewed for the demo customer so the review form can be tried.
  const keepOpen = new Set([`${demoCustomer.id}:${productIdBySlug.get("iznik-desenli-cini-tabak")}`, `${demoCustomer.id}:${productIdBySlug.get("dovme-bakir-cezve")}`]);
  for (const item of deliveredItems) {
    const key = `${item.userId}:${item.productId}`;
    if (reviewed.has(key) || keepOpen.has(key)) continue;
    const isDemo = item.userId === demoCustomer.id;
    if (!isDemo && !chance(0.5)) continue;
    reviewed.add(key);
    const r = reviewFor();
    await db.review.create({
      data: {
        productId: item.productId,
        userId: item.userId,
        rating: r.rating,
        title: r.title,
        body: r.body,
        createdAt: new Date(Math.min(item.deliveredAt.getTime() + int(1, 6) * DAY, NOW.getTime() - 3600 * 1000)),
      },
    });
  }

  // ------------------------------------------------------------ denormalised counters
  for (const [slug, id] of productIdBySlug) {
    const agg = await db.review.aggregate({ where: { productId: id }, _avg: { rating: true }, _count: { _all: true } });
    await db.product.update({
      where: { id },
      data: {
        ratingAvg: Math.round((agg._avg.rating ?? 0) * 10) / 10,
        ratingCount: agg._count._all,
        soldCount: soldCounts.get(id) ?? 0,
      },
    });
    void slug;
  }
  for (const [code, uses] of couponUses) await db.coupon.update({ where: { code }, data: { usedCount: uses } });

  // A few catalogue audit entries so the audit log shows more than order changes.
  const kupa = productIdBySlug.get("sirli-el-yapimi-kupa")!;
  await db.auditLog.createMany({
    data: [
      {
        actorId: admin.id,
        actorEmail: admin.email,
        action: "coupon.create",
        entityType: "Coupon",
        entityId: "CARSI150",
        summary: "CARSI150",
        changes: JSON.stringify({ before: null, after: { code: "CARSI150", type: "FIXED", value: 15000, minSubtotal: 150000 } }),
        createdAt: new Date(NOW.getTime() - 45 * DAY),
      },
      {
        actorId: staff.id,
        actorEmail: staff.email,
        action: "product.update",
        entityType: "Product",
        entityId: kupa,
        summary: "Sırlı El Yapımı Kupa: stock",
        changes: JSON.stringify({ before: {}, after: { stock: [{ sku: "SER-001-ADA", from: 0, to: 3 }] } }),
        createdAt: new Date(NOW.getTime() - 2 * DAY),
      },
    ],
  });

  const counts = {
    users: await db.user.count(),
    categories: await db.category.count(),
    products: await db.product.count(),
    productsWithImages: await db.product.count({ where: { images: { some: {} } } }),
    variants: await db.productVariant.count(),
    coupons: await db.coupon.count(),
    orders: await db.order.count(),
    reviews: await db.review.count(),
  };
  console.log(`[seed] done in ${Date.now() - started} ms`, counts);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
