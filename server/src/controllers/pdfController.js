import PDFDocument from "pdfkit";
import { Invoice } from "../models/Invoice.js";
import { Settings } from "../models/Settings.js";
import { BillTemplate } from "../models/BillTemplate.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const money = (amount) => `Rs. ${Number(amount || 0).toFixed(2)}`;

export const invoicePdf = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id).populate("items.item", "itemCode name");
  if (!invoice) throw new AppError("Invoice not found.", 404);
  const [company, activeTemplate] = await Promise.all([
    Settings.findOne({ key: "company" }),
    BillTemplate.findOne({ active: true }).sort({ updatedAt: -1 })
  ]);
  const template = invoice.printSnapshot || activeTemplate;
  const thermal = ["THERMAL_80", "THERMAL_58"].includes(template?.pageFormat);
  const pageSize = template?.pageFormat === "A5" ? "A5" : template?.pageFormat === "THERMAL_80" ? [226.77, 841.89] : template?.pageFormat === "THERMAL_58" ? [164.41, 841.89] : "A4";
  const doc = new PDFDocument({ size: pageSize, margin: thermal ? 12 : 42 });
  res.type("application/pdf");
  res.setHeader("Content-Disposition", `inline; filename=${invoice.invoiceNumber}.pdf`);
  doc.pipe(res);
  const info = company?.value || {};
  doc.fontSize(20).text(info.name || "Main ERP", { align: "center" });
  doc.fontSize(9).text([info.address, info.phone, info.email, info.gstNumber].filter(Boolean).join(" | "), { align: "center" });
  doc.moveDown();
  doc.fontSize(14).text(template?.header || "TAX INVOICE", { align: "center" });
  doc.moveDown(0.5);
  doc.fontSize(10).text(`Invoice: ${invoice.invoiceNumber}`);
  doc.text(`Date: ${new Date(invoice.invoiceDate).toLocaleDateString("en-IN")}`);
  doc.text(`Customer: ${invoice.customer?.name || "Walk-in Customer"}${invoice.customer?.mobile ? ` (${invoice.customer.mobile})` : ""}`);
  doc.moveDown();
  if (thermal) {
    doc.fontSize(8);
    for (const line of invoice.items) {
      doc.font("Helvetica-Bold").text(line.description).font("Helvetica");
      doc.text(`${line.quantity} ${line.unit} x ${money(line.rate)} = ${money(line.amount)}`, { align: "right" });
      doc.moveDown(0.35);
    }
    doc.moveTo(doc.page.margins.left, doc.y + 2).lineTo(doc.page.width - doc.page.margins.right, doc.y + 2).stroke();
    doc.moveDown(0.5);
    doc.text(`Subtotal: ${money(invoice.subtotal)}`, { align: "right" });
    if (template?.showDiscount !== false) doc.text(`Discount: ${money(invoice.discount)}`, { align: "right" });
    if (template?.showTax !== false) doc.text(`Tax: ${money(invoice.tax)}`, { align: "right" });
    doc.font("Helvetica-Bold").text(`TOTAL: ${money(invoice.grandTotal)}`, { align: "right" }).font("Helvetica");
    if (template?.showPayment !== false) doc.text(`Payment: ${invoice.paymentMethod}`, { align: "right" });
    if (template?.terms) { doc.moveDown(); doc.text(template.terms, { align: "center" }); }
    if (template?.footer) { doc.moveDown(); doc.text(template.footer, { align: "center" }); }
    return doc.end();
  }
  const x = { description: 42, qty: 290, rate: 360, amount: 455 };
  doc.font("Helvetica-Bold");
  doc.text("Item", x.description, doc.y, { width: 240 }); doc.text("Qty", x.qty, doc.y, { width: 55 }); doc.text("Rate", x.rate, doc.y, { width: 80 }); doc.text("Amount", x.amount, doc.y, { width: 95, align: "right" });
  doc.font("Helvetica");
  doc.moveTo(42, doc.y + 4).lineTo(550, doc.y + 4).stroke(); doc.moveDown(0.5);
  for (const line of invoice.items) {
    const y = doc.y;
    doc.text(line.description, x.description, y, { width: 240 });
    doc.text(`${line.quantity} ${line.unit}`, x.qty, y, { width: 55 });
    doc.text(money(line.rate), x.rate, y, { width: 80 });
    doc.text(money(line.amount), x.amount, y, { width: 95, align: "right" });
    doc.moveDown();
  }
  doc.moveDown();
  const totalsX = 390;
  doc.text(`Subtotal: ${money(invoice.subtotal)}`, totalsX, doc.y, { width: 160, align: "right" });
  if (template?.showDiscount !== false) doc.text(`Discount: ${money(invoice.discount)}`, totalsX, doc.y, { width: 160, align: "right" });
  if (template?.showTax !== false) doc.text(`Tax: ${money(invoice.tax)}`, totalsX, doc.y, { width: 160, align: "right" });
  doc.font("Helvetica-Bold").text(`Grand Total: ${money(invoice.grandTotal)}`, totalsX, doc.y, { width: 160, align: "right" }).font("Helvetica");
  if (template?.showPayment !== false) doc.text(`Payment: ${invoice.paymentMethod}`, totalsX, doc.y, { width: 160, align: "right" });
  if (template?.terms) { doc.moveDown(2); doc.fontSize(9).text(`Terms: ${template.terms}`); }
  if (template?.footer) { doc.moveDown(); doc.fontSize(9).text(template.footer, { align: "center" }); }
  doc.end();
});
