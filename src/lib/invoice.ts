import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import { formatTRY } from "@/lib/domain/money";
import { vatBreakdown, SHIPPING_VAT_RATE } from "@/lib/domain/vat";
import { allocateDiscount } from "@/lib/domain/pricing";
import { formatDate, getDictionary, type Locale } from "@/lib/i18n";

export type InvoiceOrder = {
  number: string;
  createdAt: Date;
  paidAt: Date | null;
  email: string;
  isDemoPayment: boolean;
  shipFullName: string;
  shipPhone: string;
  shipLine: string;
  shipDistrict: string;
  shipCity: string;
  shipPostalCode: string | null;
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  vatTotal: number;
  couponCode: string | null;
  items: Array<{ productNameTr: string; productNameEn: string; variantLabel: string; sku: string; unitPrice: number; quantity: number; vatRate: number; lineTotal: number }>;
};

const FONT_DIR = path.join(process.cwd(), "assets/fonts");

/** Renders a one-page A4 invoice (demo, no fiscal value) with Turkish-capable embedded fonts. */
export function renderInvoicePdf(order: InvoiceOrder, locale: Locale): Promise<Buffer> {
  const d = getDictionary(locale);
  const t = d.invoice;
  const doc = new PDFDocument({ size: "A4", margin: 48, info: { Title: `${t.title} ${order.number}`, Author: "Çarşı" } });
  doc.registerFont("body", fs.readFileSync(path.join(FONT_DIR, "NotoSans-Regular.ttf")));
  doc.registerFont("bold", fs.readFileSync(path.join(FONT_DIR, "NotoSans-Bold.ttf")));
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const ink = "#221d17";
  const muted = "#6b6157";
  const accent = "#9c4221";
  const left = 48;
  const right = doc.page.width - 48;

  // Watermark
  doc.save().rotate(-30, { origin: [300, 420] }).font("bold").fontSize(54).fillColor("#9c4221").opacity(0.07).text(t.demoWatermark, 40, 380, { width: 560, align: "center" }).restore();
  doc.opacity(1);

  doc.font("bold").fontSize(26).fillColor(accent).text("Çarşı", left, 48);
  doc.font("body").fontSize(9).fillColor(muted).text("Çarşı El Sanatları Ltd. Şti. (demo)\nModa Cad. No: 1, Kadıköy / İstanbul\nVKN 0000000000 · destek@carsi.demo", left, 82);
  doc.font("bold").fontSize(20).fillColor(ink).text(t.title, left, 48, { width: right - left, align: "right" });
  const invoiceNo = `INV-${order.number.replace(/^CRS-/, "")}`;
  doc.font("body").fontSize(9).fillColor(muted).text(
    `${t.invoiceNo}: ${invoiceNo}\n${t.orderNo}: ${order.number}\n${t.date}: ${formatDate(order.paidAt ?? order.createdAt, locale)}`,
    left,
    78,
    { width: right - left, align: "right" },
  );

  doc.moveTo(left, 140).lineTo(right, 140).strokeColor("#e3d9cb").lineWidth(1).stroke();
  doc.font("bold").fontSize(10).fillColor(ink).text(t.buyer, left, 154);
  doc.font("body").fontSize(9.5).fillColor(ink).text(
    `${order.shipFullName}\n${order.shipLine}\n${order.shipDistrict}/${order.shipCity} ${order.shipPostalCode ?? ""}\n${order.shipPhone} · ${order.email}`,
    left,
    170,
  );
  doc.font("bold").fontSize(10).fillColor(ink).text(t.paymentMethod, 330, 154);
  doc.font("body").fontSize(9.5).text(order.isDemoPayment ? d.account.paymentDemo : d.account.paymentIyzico, 330, 170);

  // Items table
  const cols = { item: left, qty: 300, unit: 340, vat: 425, amount: 465 };
  let y = 245;
  doc.rect(left, y - 6, right - left, 22).fill("#f1ebe2");
  doc.fillColor(ink).font("bold").fontSize(9);
  doc.text(t.item, cols.item + 6, y);
  doc.text(t.qty, cols.qty, y, { width: 34, align: "right" });
  doc.text(t.unitPrice, cols.unit, y, { width: 78, align: "right" });
  doc.text(t.vatRate, cols.vat, y, { width: 34, align: "right" });
  doc.text(t.amount, cols.amount, y, { width: right - cols.amount - 6, align: "right" });
  y += 26;
  doc.font("body").fontSize(9);
  for (const item of order.items) {
    const name = `${locale === "en" ? item.productNameEn : item.productNameTr}${item.variantLabel ? ` (${item.variantLabel})` : ""}`;
    const h = Math.max(doc.heightOfString(name, { width: 240 }), 12);
    doc.fillColor(ink).text(name, cols.item + 6, y, { width: 240 });
    doc.fillColor(muted).fontSize(7.5).text(item.sku, cols.item + 6, y + h, { width: 240 });
    doc.fontSize(9).fillColor(ink);
    doc.text(String(item.quantity), cols.qty, y, { width: 34, align: "right" });
    doc.text(formatTRY(item.unitPrice), cols.unit, y, { width: 78, align: "right" });
    doc.text(`%${item.vatRate}`, cols.vat, y, { width: 34, align: "right" });
    doc.text(formatTRY(item.lineTotal), cols.amount, y, { width: right - cols.amount - 6, align: "right" });
    y += h + 18;
    doc.moveTo(left, y - 6).lineTo(right, y - 6).strokeColor("#efe7dc").stroke();
  }

  // VAT breakdown (discount shared across lines, shipping at the standard rate)
  const shares = allocateDiscount(order.items.map((i) => i.lineTotal), order.discount);
  const vatLines = order.items.map((i, idx) => ({ gross: i.lineTotal - shares[idx]!, rate: i.vatRate }));
  if (order.shippingFee > 0) vatLines.push({ gross: order.shippingFee, rate: SHIPPING_VAT_RATE });
  const breakdown = vatBreakdown(vatLines);

  y += 8;
  const totalsTop = y;
  const labelX = 330;
  const row = (label: string, value: string, bold = false) => {
    doc.font(bold ? "bold" : "body").fontSize(bold ? 11 : 9.5).fillColor(ink);
    doc.text(label, labelX, y, { width: 130 });
    doc.text(value, labelX + 120, y, { width: right - labelX - 120, align: "right" });
    y += bold ? 20 : 16;
  };
  row(t.subtotal, formatTRY(order.subtotal));
  if (order.discount) row(`${t.discount}${order.couponCode ? ` (${order.couponCode})` : ""}`, `−${formatTRY(order.discount)}`);
  row(t.shipping, formatTRY(order.shippingFee));
  row(t.netTotal, formatTRY(order.total - order.vatTotal));
  row(t.vatTotal, formatTRY(order.vatTotal));
  doc.moveTo(labelX, y).lineTo(right, y).strokeColor(ink).stroke();
  y += 6;
  row(t.grandTotal, formatTRY(order.total), true);

  let by = totalsTop;
  doc.font("bold").fontSize(9.5).fillColor(ink).text(t.vatBreakdown, left, by);
  by += 16;
  doc.font("body").fontSize(9);
  for (const b of breakdown) {
    doc.fillColor(muted).text(`%${b.rate}`, left, by, { width: 40 });
    doc.fillColor(ink).text(`${formatTRY(b.net)} + ${formatTRY(b.vat)} = ${formatTRY(b.gross)}`, left + 40, by, { width: 230 });
    by += 14;
  }

  doc.font("body").fontSize(8).fillColor(muted).text(t.demoWatermark, left, doc.page.height - 70, { width: right - left, align: "center" });
  doc.end();
  return done;
}
