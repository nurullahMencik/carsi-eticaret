import type { Metadata } from "next";
import { CouponManager } from "@/components/admin/coupon-manager";
import { PageHeader } from "@/components/admin/page-header";
import { requirePermission } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";
import { listCouponsForAdmin } from "@/lib/services/admin/coupons";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.admin.coupons.title };
}

export default async function AdminCouponsPage() {
  const actor = await requirePermission("coupon:write", "/admin/kuponlar");
  const { dict } = await getI18n();
  const coupons = await listCouponsForAdmin(actor);
  return (
    <>
      <PageHeader title={dict.admin.coupons.title} />
      <CouponManager
        now={new Date().toISOString()}
        rows={coupons.map((c) => ({
          id: c.id,
          code: c.code,
          type: c.type,
          value: c.value,
          minSubtotal: c.minSubtotal,
          maxDiscount: c.maxDiscount,
          startsAt: c.startsAt?.toISOString() ?? null,
          endsAt: c.endsAt?.toISOString() ?? null,
          usageLimit: c.usageLimit,
          usedCount: c.usedCount,
          isActive: c.isActive,
          descriptionTr: c.descriptionTr,
          descriptionEn: c.descriptionEn,
        }))}
      />
    </>
  );
}
