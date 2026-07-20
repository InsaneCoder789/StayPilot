import "server-only";

import { jsPDF } from "jspdf";

import { getDb } from "@/lib/db";

function header(pdf: jsPDF, hotel: { name: string; city: string; country: string; phone: string; email: string }, title: string) {
  pdf.setFillColor(18, 24, 28);
  pdf.rect(0, 0, 210, 42, "F");
  pdf.setTextColor(142, 182, 155);
  pdf.setFontSize(9);
  pdf.text("STAYPILOT VERIFIED DOCUMENT", 18, 13);
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(19);
  pdf.text(hotel.name, 18, 26);
  pdf.setFontSize(8);
  pdf.text(`${hotel.city}, ${hotel.country} | ${hotel.phone} | ${hotel.email}`, 18, 35);
  pdf.setTextColor(30, 35, 38);
  pdf.setFontSize(16);
  pdf.text(title, 18, 56);
}

export async function renderDocumentPdf(hotelId: string, documentId: string) {
  const db = getDb();
  const document = await db.document.findFirst({ where: { id: documentId, hotelId }, include: { hotel: true } });
  if (!document) throw new Error("DOCUMENT_NOT_FOUND");
  const pdf = new jsPDF();
  header(pdf, document.hotel, document.title);
  pdf.setFontSize(9);
  pdf.text(`Reference: ${document.linkedRef}`, 18, 68);
  pdf.text(`Classification: ${document.type.replaceAll("_", " ")}`, 18, 75);
  pdf.text(`Issued: ${document.createdAt.toISOString()}`, 18, 82);

  if (document.type === "INVOICE") {
    const invoice = await db.invoice.findFirst({ where: { hotelId, invoiceNumber: document.linkedRef }, include: { items: true } });
    if (invoice) {
      pdf.text(`Guest: ${invoice.guestName}`, 18, 94);
      pdf.text(`Booking: ${invoice.bookingCode}`, 18, 101);
      let y = 116;
      for (const item of invoice.items) {
        pdf.text(item.label, 18, y);
        pdf.text(`${invoice.currency} ${Number(item.amount).toFixed(2)}`, 190, y, { align: "right" });
        y += 8;
      }
      pdf.line(18, y, 190, y);
      pdf.text(`Total ${invoice.currency} ${Number(invoice.totalAmount).toFixed(2)}`, 190, y + 11, { align: "right" });
      pdf.text(`Paid ${invoice.currency} ${Number(invoice.paidAmount).toFixed(2)}`, 190, y + 19, { align: "right" });
      pdf.text(`Balance ${invoice.currency} ${Number(invoice.balanceAmount).toFixed(2)}`, 190, y + 27, { align: "right" });
    }
  } else if (document.type === "RECEIPT") {
    const receiptNumber = document.title.replace(/^Receipt\s+/i, "");
    const receipt = await db.receipt.findFirst({ where: { hotelId, receiptNumber } });
    if (receipt) {
      pdf.text(`Guest: ${receipt.guestName}`, 18, 94);
      pdf.text(`Invoice: ${receipt.invoiceNumber}`, 18, 101);
      pdf.text(`Method: ${receipt.method.replaceAll("_", " ")}`, 18, 108);
      pdf.setFontSize(18);
      pdf.text(`${document.hotel.currency} ${Number(receipt.amount).toFixed(2)}`, 18, 126);
    }
  } else if (document.type === "CREDIT_NOTE") {
    const creditNoteNumber = document.title.replace(/^Credit note\s+/i, "");
    const note = await db.creditNote.findFirst({ where: { hotelId, creditNoteNumber }, include: { invoice: true } });
    if (note) {
      pdf.text(`Invoice: ${note.invoice.invoiceNumber}`, 18, 94);
      pdf.text(`Guest: ${note.invoice.guestName}`, 18, 101);
      pdf.text(`Reason: ${note.reason}`, 18, 108, { maxWidth: 170 });
      pdf.setFontSize(18);
      pdf.text(`${note.invoice.currency} ${Number(note.amount).toFixed(2)}`, 18, 130);
    }
  }

  pdf.setFontSize(8);
  pdf.setTextColor(100, 105, 108);
  pdf.text(`Document ID ${document.id}`, 18, 278);
  pdf.text("Generated from the authoritative StayPilot property ledger.", 18, 284);
  return { bytes: new Uint8Array(pdf.output("arraybuffer")), fileName: `${document.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "document"}.pdf` };
}
