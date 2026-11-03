import { db, isUniqueViolation } from "@/lib/db";
import { DomainError, NotFoundError } from "@/lib/domain/errors";
import { assertCan, type Actor } from "@/lib/domain/roles";
import { categorySchema, type CategoryFormInput } from "@/lib/validation/catalog";
import { recordAudit } from "../audit";

export async function listCategoriesForAdmin(actor: Actor) {
  assertCan(actor, "category:write");
  return db.category.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { products: true } } } });
}

export async function saveCategory(actor: Actor, id: string | null, raw: CategoryFormInput) {
  assertCan(actor, "category:write");
  const input = categorySchema.parse(raw);
  try {
    return await db.$transaction(async (tx) => {
      const before = id ? await tx.category.findUnique({ where: { id } }) : null;
      if (id && !before) throw new NotFoundError("Category");
      const category = id ? await tx.category.update({ where: { id }, data: input }) : await tx.category.create({ data: input });
      await recordAudit(tx, actor, {
        action: id ? "category.update" : "category.create",
        entityType: "Category",
        entityId: category.id,
        summary: `${input.nameTr} (${input.slug})`,
        before: before ? { slug: before.slug, nameTr: before.nameTr, nameEn: before.nameEn, sortOrder: before.sortOrder } : undefined,
        after: { slug: input.slug, nameTr: input.nameTr, nameEn: input.nameEn, sortOrder: input.sortOrder },
      });
      return category;
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new DomainError("SLUG_TAKEN");
    throw error;
  }
}

export async function deleteCategory(actor: Actor, id: string) {
  assertCan(actor, "category:write");
  const category = await db.category.findUnique({ where: { id }, include: { _count: { select: { products: true } } } });
  if (!category) throw new NotFoundError("Category");
  if (category._count.products > 0) throw new DomainError("CATEGORY_NOT_EMPTY");
  await db.$transaction(async (tx) => {
    await tx.category.delete({ where: { id } });
    await recordAudit(tx, actor, { action: "category.delete", entityType: "Category", entityId: id, summary: category.nameTr, before: { slug: category.slug } });
  });
}
