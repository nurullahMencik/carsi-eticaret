import { z } from "zod";
import { ORDER_STATUSES } from "@/lib/domain/order-status";
import { idField } from "./common";

export const CARRIERS = ["Yurtiçi Kargo", "Aras Kargo", "MNG Kargo", "PTT Kargo", "Sürat Kargo"] as const;

export const orderStatusUpdateSchema = z
  .object({
    orderId: idField,
    toStatus: z.enum(ORDER_STATUSES),
    note: z.string().trim().max(300, "tooLong").optional(),
    carrier: z.string().trim().max(40, "tooLong").optional(),
    trackingNumber: z.string().trim().max(40, "tooLong").optional(),
  })
  .superRefine((v, ctx) => {
    if (v.toStatus === "SHIPPED") {
      if (!v.carrier) ctx.addIssue({ code: "custom", path: ["carrier"], message: "required" });
      if (!v.trackingNumber || !/^[A-Za-z0-9-]{6,40}$/.test(v.trackingNumber)) {
        ctx.addIssue({ code: "custom", path: ["trackingNumber"], message: "trackingNumber" });
      }
    }
  });
export type OrderStatusUpdateInput = z.input<typeof orderStatusUpdateSchema>;

export const adminOrderFilterSchema = z.object({
  durum: z.enum(ORDER_STATUSES).optional().catch(undefined),
  q: z
    .string()
    .optional()
    .transform((v) => (v ? v.trim().slice(0, 80) : undefined))
    .catch(undefined),
  odeme: z.enum(["DEMO", "IYZICO"]).optional().catch(undefined),
  baslangic: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .catch(undefined),
  bitis: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .catch(undefined),
  sayfa: z.coerce.number().int().min(1).max(10000).optional().catch(undefined),
});
export type AdminOrderFilter = z.output<typeof adminOrderFilterSchema>;
