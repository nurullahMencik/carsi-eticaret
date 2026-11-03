import { ForbiddenError } from "./errors";

export const ROLES = ["CUSTOMER", "STAFF", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];
/** Roles that can act on orders; SYSTEM is used for payment callbacks and jobs. */
export type ActorRole = Role | "SYSTEM";

export type Actor = { id: string; email: string; role: Role };

const PERMISSIONS = {
  "admin:access": ["STAFF", "ADMIN"],
  "dashboard:read": ["STAFF", "ADMIN"],
  "product:write": ["STAFF", "ADMIN"],
  "category:write": ["STAFF", "ADMIN"],
  "order:read-all": ["STAFF", "ADMIN"],
  "order:update-status": ["STAFF", "ADMIN"],
  "order:refund": ["ADMIN"],
  "customer:read": ["STAFF", "ADMIN"],
  "coupon:write": ["ADMIN"],
  "audit:read": ["ADMIN"],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export function can(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}

export function assertCan(actor: Actor | null | undefined, permission: Permission): asserts actor is Actor {
  if (!actor || !can(actor.role, permission)) throw new ForbiddenError(permission);
}
