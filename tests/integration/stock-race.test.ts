import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { confirmPayment, rejectCapturedPayment } from "@/lib/services/orders";
import { demoPayment, makePendingOrder, makeProduct, makeUser } from "./helpers";

const run = promisify(execFile);

/** Confirms each order from its own Node process (separate connection), all starting at the same instant. */
async function confirmInSeparateProcesses(orders: Array<{ id: string; total: number }>) {
  const startAt = Date.now() + 2500;
  const outputs = await Promise.all(
    orders.map((o) =>
      run("npx", ["tsx", "tests/integration/race-worker.ts", o.id, String(o.total), String(startAt)], {
        env: { ...process.env, DATABASE_URL: "file:./data/test-integration.db" },
      }),
    ),
  );
  return outputs.map((o) => JSON.parse(o.stdout.split("\n").find((l) => l.startsWith("RESULT:"))!.slice(7)) as { status: string; code?: string });
}

async function orderFor(stocks: number[], quantities: number[]) {
  const product = await makeProduct(stocks);
  const buyer = await makeUser();
  const order = await makePendingOrder(
    buyer.id,
    quantities.map((quantity, i) => ({ productId: product.id, variantId: product.variants[i]!.id, sku: product.variants[i]!.sku, quantity, unitPrice: product.price })),
  );
  return { product, buyer, order };
}

describe("stock is taken when the payment is confirmed, in one transaction", () => {
  it("marks the order paid and decrements stock together", async () => {
    const { product, order } = await orderFor([5], [2]);
    const result = await confirmPayment(order.id, demoPayment(order.total));
    expect(result).toEqual({ status: "paid", orderId: order.id, alreadyProcessed: false });

    const variant = await db.productVariant.findUniqueOrThrow({ where: { id: product.variants[0]!.id } });
    const saved = await db.order.findUniqueOrThrow({ where: { id: order.id }, include: { events: true, payments: true } });
    expect(variant.stock).toBe(3);
    expect(saved).toMatchObject({ status: "PAID", paymentStatus: "PAID" });
    expect(saved.events.map((e) => e.toStatus)).toEqual(["PENDING", "PAID"]);
    expect(saved.payments).toHaveLength(1);
    expect((await db.product.findUniqueOrThrow({ where: { id: product.id } })).soldCount).toBe(2);
  });

  it("rolls everything back when any line cannot be fulfilled", async () => {
    const { product, order } = await orderFor([5, 1], [2, 2]);
    const result = await confirmPayment(order.id, demoPayment(order.total));
    expect(result).toMatchObject({ status: "rejected", code: "OUT_OF_STOCK", sku: product.variants[1]!.sku });

    const variants = await db.productVariant.findMany({ where: { productId: product.id }, orderBy: { sku: "asc" } });
    expect(variants.map((v) => v.stock)).toEqual([5, 1]); // first line's decrement was rolled back
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("PENDING");
    expect(await db.paymentAttempt.count({ where: { orderId: order.id } })).toBe(0);
  });

  it("is idempotent when the same payment is delivered twice", async () => {
    const { product, order } = await orderFor([4], [1]);
    const payment = demoPayment(order.total, "demo_same_ref");
    await confirmPayment(order.id, payment);
    expect(await confirmPayment(order.id, payment)).toMatchObject({ status: "paid", alreadyProcessed: true });
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: product.variants[0]!.id } })).stock).toBe(3);
  });

  it("rejects an amount that differs from the order total", async () => {
    const { product, order } = await orderFor([4], [1]);
    expect(await confirmPayment(order.id, demoPayment(order.total - 1))).toMatchObject({ status: "rejected", code: "AMOUNT_MISMATCH" });
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: product.variants[0]!.id } })).stock).toBe(4);
  });
});

describe("two customers race for the last unit", () => {
  it("lets exactly one win (same server process)", async () => {
    const product = await makeProduct([1]);
    const [a, b] = [await makeUser(), await makeUser()];
    const line = { productId: product.id, variantId: product.variants[0]!.id, sku: product.variants[0]!.sku, quantity: 1, unitPrice: product.price };
    const [orderA, orderB] = [await makePendingOrder(a.id, [line]), await makePendingOrder(b.id, [line])];

    const results = await Promise.all([confirmPayment(orderA.id, demoPayment(orderA.total)), confirmPayment(orderB.id, demoPayment(orderB.total))]);

    expect(results.filter((r) => r.status === "paid")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected" && r.code === "OUT_OF_STOCK")).toHaveLength(1);
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: line.variantId } })).stock).toBe(0);
    const statuses = (await db.order.findMany({ where: { id: { in: [orderA.id, orderB.id] } } })).map((o) => o.status).sort();
    expect(statuses).toEqual(["PAID", "PENDING"]);
  });

  it("lets exactly one win across two server processes (separate SQLite connections)", async () => {
    const product = await makeProduct([1]);
    const [a, b] = [await makeUser(), await makeUser()];
    const line = { productId: product.id, variantId: product.variants[0]!.id, sku: product.variants[0]!.sku, quantity: 1, unitPrice: product.price };
    const [orderA, orderB] = [await makePendingOrder(a.id, [line]), await makePendingOrder(b.id, [line])];

    const results = await confirmInSeparateProcesses([orderA, orderB]);

    expect(results.map((r) => r.status).sort()).toEqual(["paid", "rejected"]);
    expect(results.find((r) => r.status === "rejected")?.code).toBe("OUT_OF_STOCK");
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: line.variantId } })).stock).toBe(0);
  }, 60_000);

  it("never oversells under heavier contention", async () => {
    for (let round = 0; round < 5; round++) {
      const initial = 3;
      const product = await makeProduct([initial]);
      const variant = product.variants[0]!;
      const buyers = await Promise.all(Array.from({ length: 8 }, () => makeUser()));
      const orders = await Promise.all(
        buyers.map((b, i) =>
          makePendingOrder(b.id, [{ productId: product.id, variantId: variant.id, sku: variant.sku, quantity: (i % 2) + 1, unitPrice: product.price }]),
        ),
      );
      const results = await Promise.all(orders.map((o) => confirmPayment(o.id, demoPayment(o.total))));
      const paidIds = new Set(results.filter((r) => r.status === "paid").map((r) => r.orderId));
      const sold = orders.filter((o) => paidIds.has(o.id)).reduce((a, o) => a + o.total / product.price, 0);
      const stock = (await db.productVariant.findUniqueOrThrow({ where: { id: variant.id } })).stock;
      expect(stock).toBeGreaterThanOrEqual(0);
      expect(sold + stock).toBe(initial);
    }
  });

  it("never oversells across four processes buying 1–2 units of 3", async () => {
    const product = await makeProduct([3]);
    const variant = product.variants[0]!;
    const buyers = await Promise.all(Array.from({ length: 4 }, () => makeUser()));
    const orders = await Promise.all(
      buyers.map((b, i) => makePendingOrder(b.id, [{ productId: product.id, variantId: variant.id, sku: variant.sku, quantity: (i % 2) + 1, unitPrice: product.price }])),
    );
    const results = await confirmInSeparateProcesses(orders);
    expect(results.every((r) => r.status === "paid" || r.code === "OUT_OF_STOCK")).toBe(true);
    const sold = orders.filter((_, i) => results[i]!.status === "paid").reduce((a, o) => a + o.total / product.price, 0);
    const stock = (await db.productVariant.findUniqueOrThrow({ where: { id: variant.id } })).stock;
    expect(stock).toBeGreaterThanOrEqual(0);
    expect(sold + stock).toBe(3);
  }, 60_000);

  it("cancels the losing order and voids its captured payment", async () => {
    const { order } = await orderFor([0], [1]);
    const payment = demoPayment(order.total);
    expect(await confirmPayment(order.id, payment)).toMatchObject({ status: "rejected", code: "OUT_OF_STOCK" });
    const refund = await rejectCapturedPayment(order.id, payment, "OUT_OF_STOCK");
    expect(refund.ok).toBe(true);
    const saved = await db.order.findUniqueOrThrow({ where: { id: order.id }, include: { events: true, payments: true } });
    expect(saved).toMatchObject({ status: "CANCELLED", paymentStatus: "REFUNDED" });
    expect(saved.events.at(-1)).toMatchObject({ fromStatus: "PENDING", toStatus: "CANCELLED", actorRole: "SYSTEM", note: "OUT_OF_STOCK" });
    expect(saved.payments[0]).toMatchObject({ status: "REFUNDED", errorCode: "OUT_OF_STOCK" });
  });
});

describe("SQLite connection isolation", () => {
  it("does not lose a concurrent write when another request's transaction rolls back", async () => {
    const { order } = await orderFor([0], [1]); // will roll back with OUT_OF_STOCK
    const [result, log] = await Promise.all([
      confirmPayment(order.id, demoPayment(order.total)),
      db.emailLog.create({ data: { to: "x@test.demo", subject: "concurrent", template: "t", status: "LOGGED" } }),
    ]);
    expect(result.status).toBe("rejected");
    expect(await db.emailLog.findUnique({ where: { id: log.id } })).not.toBeNull();
  });
});
