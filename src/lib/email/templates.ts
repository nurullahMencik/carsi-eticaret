import { formatTRY } from "@/lib/domain/money";
import { fmt, formatDateTime, getDictionary, type Locale } from "@/lib/i18n";

type OrderForEmail = {
  number: string;
  total: number;
  subtotal: number;
  discount: number;
  shippingFee: number;
  createdAt: Date;
  carrier: string | null;
  trackingNumber: string | null;
  items: Array<{ productNameTr: string; productNameEn: string; variantLabel: string; quantity: number; lineTotal: number }>;
};

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout(title: string, body: string, footer: string) {
  return `<!doctype html><html><body style="margin:0;background:#f6f1ea;font-family:Helvetica,Arial,sans-serif;color:#231f1a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fffdf9;border:1px solid #e7ddd0;border-radius:12px">
<tr><td style="padding:28px 32px 8px;font-family:Georgia,serif;font-size:26px;letter-spacing:.02em">Çarşı</td></tr>
<tr><td style="padding:8px 32px 0;font-size:18px;font-weight:bold">${escapeHtml(title)}</td></tr>
<tr><td style="padding:12px 32px 28px;font-size:15px;line-height:1.6">${body}</td></tr>
</table>
<p style="font-size:12px;color:#6f6559;margin-top:16px">${escapeHtml(footer)}</p>
</td></tr></table></body></html>`;
}

function itemsTable(order: OrderForEmail, locale: Locale) {
  const rows = order.items
    .map((i) => {
      const name = escapeHtml(locale === "en" ? i.productNameEn : i.productNameTr);
      const variant = i.variantLabel ? ` <span style="color:#6f6559">(${escapeHtml(i.variantLabel)})</span>` : "";
      return `<tr><td style="padding:6px 0">${i.quantity} × ${name}${variant}</td><td align="right" style="padding:6px 0">${formatTRY(i.lineTotal)}</td></tr>`;
    })
    .join("");
  return `<table role="presentation" width="100%" style="border-top:1px solid #e7ddd0;margin-top:16px;font-size:14px">${rows}</table>`;
}

export function orderConfirmationEmail(order: OrderForEmail, name: string, locale: Locale, orderUrl: string) {
  const d = getDictionary(locale);
  const subject = fmt(d.email.orderConfirmationSubject, { number: order.number });
  const totals = `<table role="presentation" width="100%" style="border-top:1px solid #e7ddd0;margin-top:8px;font-size:14px">
<tr><td>${d.cart.subtotal}</td><td align="right">${formatTRY(order.subtotal)}</td></tr>
${order.discount ? `<tr><td>${d.cart.discount}</td><td align="right">−${formatTRY(order.discount)}</td></tr>` : ""}
<tr><td>${d.cart.shipping}</td><td align="right">${order.shippingFee ? formatTRY(order.shippingFee) : d.cart.free}</td></tr>
<tr><td style="font-weight:bold;padding-top:6px">${d.cart.total}</td><td align="right" style="font-weight:bold;padding-top:6px">${formatTRY(order.total)}</td></tr></table>`;
  const body = `<p>${escapeHtml(fmt(d.email.greeting, { name }))}</p><p>${escapeHtml(d.email.orderConfirmationIntro)}</p>
<p><strong>${d.account.orderNumber}:</strong> ${order.number} · ${formatDateTime(order.createdAt, locale)}</p>
${itemsTable(order, locale)}${totals}
<p style="margin-top:24px"><a href="${orderUrl}" style="background:#9c4221;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none">${d.email.viewOrder}</a></p>`;
  const text = `${fmt(d.email.greeting, { name })}\n${d.email.orderConfirmationIntro}\n${d.account.orderNumber}: ${order.number}\n${d.cart.total}: ${formatTRY(order.total)}\n${orderUrl}`;
  return { subject, html: layout(subject, body, d.email.footer), text };
}

export function orderStatusEmail(order: OrderForEmail, statusLabel: string, name: string, locale: Locale, orderUrl: string) {
  const d = getDictionary(locale);
  const subject = fmt(d.email.statusSubject, { status: statusLabel.toLocaleLowerCase(locale === "en" ? "en" : "tr-TR"), number: order.number });
  const tracking =
    order.carrier && order.trackingNumber
      ? `<p>${escapeHtml(fmt(d.email.trackingLine, { carrier: order.carrier, tracking: order.trackingNumber }))}</p>`
      : "";
  const body = `<p>${escapeHtml(fmt(d.email.greeting, { name }))}</p><p>${escapeHtml(fmt(d.email.statusIntro, { number: order.number, status: statusLabel }))}</p>${tracking}
<p style="margin-top:24px"><a href="${orderUrl}" style="background:#9c4221;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none">${d.email.viewOrder}</a></p>`;
  const text = `${fmt(d.email.greeting, { name })}\n${fmt(d.email.statusIntro, { number: order.number, status: statusLabel })}\n${orderUrl}`;
  return { subject, html: layout(subject, body, d.email.footer), text };
}
