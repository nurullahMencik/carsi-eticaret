import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { can, isRole, type Actor, type Permission } from "@/lib/domain/roles";

/**
 * The signed-in user with a role read fresh from the database (a JWT may carry a stale role).
 * Cached per request.
 */
export const getActor = cache(async (): Promise<Actor | null> => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const user = await db.user.findUnique({ where: { id }, select: { id: true, email: true, role: true } });
  if (!user || !isRole(user.role)) return null;
  return { id: user.id, email: user.email, role: user.role };
});

export async function requireActor(callbackUrl: string): Promise<Actor> {
  const actor = await getActor();
  if (!actor) redirect(`/giris?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  return actor;
}

/** For admin pages: redirects guests to sign-in and shows the 403 page to customers. */
export async function requirePermission(permission: Permission, callbackUrl = "/admin"): Promise<Actor> {
  const actor = await requireActor(callbackUrl);
  if (!can(actor.role, permission)) redirect("/admin/yetkisiz");
  return actor;
}
