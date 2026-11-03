import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email/send";
import { orderConfirmationEmail, orderStatusEmail } from "@/lib/email/templates";
import { siteUrl } from "@/lib/env";
import { getDictionary, isLocale } from "@/lib/i18n";
import { isOrderStatus, type OrderStatus } from "@/lib/domain/order-status";

async function loadOrder(orderId: string) {
  return db.order.findUnique({ where: { id: orderId }, include: { items: true, user: { select: { name: true } } } });
}

export async function sendOrderConfirmationEmail(orderId: string) {
  const order = await loadOrder(orderId);
  if (!order) return;
  const locale = isLocale(order.locale) ? order.locale : "tr";
  const url = `${siteUrl()}/hesabim/siparisler/${order.number}`;
  const mail = orderConfirmationEmail(order, order.user.name, locale, url);
  await sendEmail({ to: order.email, template: "order-confirmation", ...mail });
}

const NOTIFY: OrderStatus[] = ["PREPARING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"];

export async function sendOrderStatusEmail(orderId: string, status: string) {
  if (!isOrderStatus(status) || !NOTIFY.includes(status)) return;
  const order = await loadOrder(orderId);
  if (!order) return;
  const locale = isLocale(order.locale) ? order.locale : "tr";
  const label = getDictionary(locale).orderStatus[status];
  const url = `${siteUrl()}/hesabim/siparisler/${order.number}`;
  const mail = orderStatusEmail(order, label, order.user.name, locale, url);
  await sendEmail({ to: order.email, template: `order-status-${status.toLowerCase()}`, ...mail });
}
