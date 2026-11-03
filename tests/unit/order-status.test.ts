import { describe, expect, it } from "vitest";
import {
  assertTransition,
  canTransition,
  InvalidTransitionError,
  isTerminal,
  nextStatuses,
  ORDER_STATUSES,
  transitionEffects,
} from "@/lib/domain/order-status";
import { assertCan, can } from "@/lib/domain/roles";
import { ForbiddenError } from "@/lib/domain/errors";

describe("order state machine", () => {
  it("follows the fulfilment path PENDING → PAID → PREPARING → SHIPPED → DELIVERED", () => {
    expect(canTransition("PENDING", "PAID", "SYSTEM")).toBe(true);
    expect(canTransition("PAID", "PREPARING", "STAFF")).toBe(true);
    expect(canTransition("PREPARING", "SHIPPED", "STAFF")).toBe(true);
    expect(canTransition("SHIPPED", "DELIVERED", "STAFF")).toBe(true);
  });

  it("only the payment confirmation (SYSTEM) can mark an order as paid", () => {
    expect(canTransition("PENDING", "PAID", "ADMIN")).toBe(false);
    expect(canTransition("PENDING", "PAID", "CUSTOMER")).toBe(false);
  });

  it("rejects skipping steps and moving backwards", () => {
    expect(() => assertTransition("PENDING", "SHIPPED", "ADMIN")).toThrow(InvalidTransitionError);
    expect(() => assertTransition("DELIVERED", "PREPARING", "ADMIN")).toThrow(InvalidTransitionError);
    expect(() => assertTransition("SHIPPED", "PAID", "SYSTEM")).toThrow(InvalidTransitionError);
  });

  it("distinguishes impossible transitions from forbidden ones", () => {
    try {
      assertTransition("PENDING", "SHIPPED", "ADMIN");
    } catch (e) {
      expect((e as InvalidTransitionError).code).toBe("INVALID_TRANSITION");
    }
    try {
      assertTransition("PAID", "PREPARING", "CUSTOMER");
    } catch (e) {
      expect((e as InvalidTransitionError).code).toBe("FORBIDDEN_TRANSITION");
    }
    expect(() => assertTransition("NONSENSE", "PAID", "SYSTEM")).toThrow(InvalidTransitionError);
  });

  it("lets customers cancel only before preparation starts", () => {
    expect(canTransition("PENDING", "CANCELLED", "CUSTOMER")).toBe(true);
    expect(canTransition("PAID", "CANCELLED", "CUSTOMER")).toBe(true);
    expect(canTransition("PREPARING", "CANCELLED", "CUSTOMER")).toBe(false);
    expect(canTransition("PREPARING", "CANCELLED", "STAFF")).toBe(true);
    expect(canTransition("SHIPPED", "CANCELLED", "ADMIN")).toBe(false);
  });

  it("allows refunds (returns) of delivered orders to admins only", () => {
    expect(canTransition("DELIVERED", "REFUNDED", "ADMIN")).toBe(true);
    expect(canTransition("DELIVERED", "REFUNDED", "STAFF")).toBe(false);
    expect(canTransition("DELIVERED", "REFUNDED", "CUSTOMER")).toBe(false);
  });

  it("treats CANCELLED and REFUNDED as terminal", () => {
    expect(isTerminal("CANCELLED")).toBe(true);
    expect(isTerminal("REFUNDED")).toBe(true);
    expect(isTerminal("DELIVERED")).toBe(false);
    for (const s of ORDER_STATUSES) {
      expect(canTransition("CANCELLED", s, "ADMIN")).toBe(false);
      expect(canTransition("REFUNDED", s, "ADMIN")).toBe(false);
    }
  });

  it("lists the next statuses per role", () => {
    expect(nextStatuses("PAID", "STAFF")).toEqual(["PREPARING", "CANCELLED"]);
    expect(nextStatuses("PAID", "CUSTOMER")).toEqual(["CANCELLED"]);
    expect(nextStatuses("DELIVERED", "STAFF")).toEqual([]);
    expect(nextStatuses("DELIVERED", "ADMIN")).toEqual(["REFUNDED"]);
  });

  it("restocks and refunds only when stock had been taken", () => {
    expect(transitionEffects("PENDING", "CANCELLED")).toMatchObject({ restock: false, refundPayment: false });
    expect(transitionEffects("PAID", "CANCELLED")).toMatchObject({ restock: true, refundPayment: true });
    expect(transitionEffects("PREPARING", "CANCELLED")).toMatchObject({ restock: true, refundPayment: true });
    expect(transitionEffects("DELIVERED", "REFUNDED")).toMatchObject({ restock: true, refundPayment: true });
    expect(transitionEffects("PREPARING", "SHIPPED")).toMatchObject({ restock: false, requiresTracking: true });
  });
});

describe("role permissions", () => {
  it("keeps customers out of every admin permission", () => {
    for (const p of ["admin:access", "product:write", "order:update-status", "order:refund", "coupon:write", "audit:read"] as const) {
      expect(can("CUSTOMER", p)).toBe(false);
    }
  });
  it("gives staff day-to-day permissions but not refunds, coupons or the audit log", () => {
    expect(can("STAFF", "order:update-status")).toBe(true);
    expect(can("STAFF", "product:write")).toBe(true);
    expect(can("STAFF", "order:refund")).toBe(false);
    expect(can("STAFF", "coupon:write")).toBe(false);
    expect(can("STAFF", "audit:read")).toBe(false);
  });
  it("gives admins everything", () => {
    expect(can("ADMIN", "order:refund")).toBe(true);
    expect(can("ADMIN", "audit:read")).toBe(true);
  });
  it("assertCan throws ForbiddenError for missing actors and permissions", () => {
    expect(() => assertCan(null, "admin:access")).toThrow(ForbiddenError);
    expect(() => assertCan({ id: "u", email: "a@b.c", role: "CUSTOMER" }, "product:write")).toThrow(ForbiddenError);
    expect(() => assertCan({ id: "u", email: "a@b.c", role: "ADMIN" }, "product:write")).not.toThrow();
  });
});
