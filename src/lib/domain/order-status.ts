import { DomainError } from "./errors";
import type { ActorRole } from "./roles";

export const ORDER_STATUSES = ["PENDING", "PAID", "PREPARING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = ["UNPAID", "PAID", "FAILED", "REFUNDED"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/** The "happy path" in display order, used by timelines. */
export const FULFILMENT_FLOW: OrderStatus[] = ["PENDING", "PAID", "PREPARING", "SHIPPED", "DELIVERED"];

/**
 * Allowed transitions and who may perform them.
 * PENDING -> PAID is only ever done by the payment confirmation (SYSTEM).
 */
const TRANSITIONS: Record<OrderStatus, Partial<Record<OrderStatus, readonly ActorRole[]>>> = {
  PENDING: { PAID: ["SYSTEM"], CANCELLED: ["SYSTEM", "CUSTOMER", "STAFF", "ADMIN"] },
  PAID: { PREPARING: ["STAFF", "ADMIN"], CANCELLED: ["CUSTOMER", "STAFF", "ADMIN"] },
  PREPARING: { SHIPPED: ["STAFF", "ADMIN"], CANCELLED: ["STAFF", "ADMIN"] },
  SHIPPED: { DELIVERED: ["SYSTEM", "STAFF", "ADMIN"] },
  DELIVERED: { REFUNDED: ["ADMIN"] },
  CANCELLED: {},
  REFUNDED: {},
};

export function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value);
}

export function isTerminal(status: OrderStatus): boolean {
  return Object.keys(TRANSITIONS[status]).length === 0;
}

export function canTransition(from: OrderStatus, to: OrderStatus, role: ActorRole): boolean {
  return TRANSITIONS[from]?.[to]?.includes(role) ?? false;
}

/** Statuses `role` may move an order to from `from`. */
export function nextStatuses(from: OrderStatus, role: ActorRole): OrderStatus[] {
  return (Object.entries(TRANSITIONS[from]) as [OrderStatus, readonly ActorRole[]][])
    .filter(([, roles]) => roles.includes(role))
    .map(([to]) => to);
}

export class InvalidTransitionError extends DomainError {
  constructor(
    readonly from: string,
    readonly to: string,
    readonly role: string,
    kind: "INVALID_TRANSITION" | "FORBIDDEN_TRANSITION",
  ) {
    super(kind, `Order cannot move from ${from} to ${to} (${role})`);
  }
}

export function assertTransition(from: string, to: string, role: ActorRole): asserts from is OrderStatus {
  if (!isOrderStatus(from) || !isOrderStatus(to)) throw new InvalidTransitionError(from, to, role, "INVALID_TRANSITION");
  const exists = TRANSITIONS[from][to] !== undefined;
  if (!exists) throw new InvalidTransitionError(from, to, role, "INVALID_TRANSITION");
  if (!canTransition(from, to, role)) throw new InvalidTransitionError(from, to, role, "FORBIDDEN_TRANSITION");
}

/** Side effects a transition implies. Stock is only decremented once an order is PAID. */
export function transitionEffects(from: OrderStatus, to: OrderStatus) {
  const stockWasTaken = from === "PAID" || from === "PREPARING" || from === "SHIPPED" || from === "DELIVERED";
  return {
    restock: (to === "CANCELLED" || to === "REFUNDED") && stockWasTaken,
    refundPayment: (to === "CANCELLED" || to === "REFUNDED") && stockWasTaken,
    requiresTracking: to === "SHIPPED",
  };
}
