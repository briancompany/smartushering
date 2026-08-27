import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type QuoteInput = {
  reference: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string | null;
  event_type: string;
  event_date?: string | null;
  event_dates?: string[];
  number_of_days: number;
  venue?: string | null;
  county?: string | null;
  package_name: string;
  number_of_ushers: number;
  package_price_kes: number;
  /** Transport per usher, per day */
  transport_rate_kes: number;
  /** Total transport = rate x ushers x days */
  transport_kes: number;
  valid_until?: string | null;
  notes?: string | null;
};

export async function generateQuotePdf(q: QuoteInput): Promise<{ path: string; signedUrl: string }> {
  const days = Math.max(1, q.number_of_days);
  const subtotal = q.package_price_kes * q.number_of_ushers * days;
  const total = subtotal + q.transport_kes;

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]); // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const navy = rgb(0.07, 0.13, 0.27);
  const gold = rgb(0.78, 0.66, 0.36);
  const gray = rgb(0.4, 0.4, 0.45);

  // Header
  page.drawRectangle({ x: 0, y: 782, width: 595, height: 60, color: navy });
  page.drawText("SMART USHERING", { x: 40, y: 810, size: 20, font: bold, color: gold });
  page.drawText("Every Guest Matters. Every Event Counts.", { x: 40, y: 794, size: 9, font, color: rgb(1, 1, 1) });
  page.drawText("Nairobi, Kenya  •  0112 836 281  •  Smartushering@gmail.com", { x: 300, y: 794, size: 8, font, color: rgb(1, 1, 1) });

  let y = 750;
  page.drawText("QUOTATION", { x: 40, y, size: 22, font: bold, color: navy }); y -= 8;
  page.drawText(`Reference: ${q.reference}`, { x: 40, y: y - 12, size: 10, font, color: gray });
  page.drawText(`Date: ${new Date().toLocaleDateString("en-KE")}`, { x: 420, y: y - 12, size: 10, font, color: gray });
  y -= 36;

  // Customer block
  page.drawText("Prepared for:", { x: 40, y, size: 9, font: bold, color: gray }); y -= 14;
  page.drawText(q.customer_name, { x: 40, y, size: 12, font: bold, color: navy }); y -= 14;
  page.drawText(q.customer_email, { x: 40, y, size: 10, font, color: gray }); y -= 12;
  if (q.customer_phone) { page.drawText(q.customer_phone, { x: 40, y, size: 10, font, color: gray }); y -= 12; }
  y -= 8;

  // Event details
  const lines: Array<[string, string]> = [
    ["Event Type", q.event_type],
    ["Event Date", q.event_date ?? "TBD"],
    ["Venue", q.venue ?? "TBD"],
    ["County", q.county ?? "TBD"],
    ["Package", q.package_name],
    ["Number of Ushers", String(q.number_of_ushers)],
  ];
  for (const [k, v] of lines) {
    page.drawText(k, { x: 40, y, size: 10, font: bold, color: navy });
    page.drawText(v, { x: 200, y, size: 10, font, color: gray });
    y -= 16;
  }
  y -= 10;

  // Cost table
  page.drawRectangle({ x: 40, y: y - 4, width: 515, height: 22, color: navy });
  page.drawText("Description", { x: 50, y: y + 4, size: 10, font: bold, color: rgb(1, 1, 1) });
  page.drawText("Qty", { x: 320, y: y + 4, size: 10, font: bold, color: rgb(1, 1, 1) });
  page.drawText("Rate", { x: 380, y: y + 4, size: 10, font: bold, color: rgb(1, 1, 1) });
  page.drawText("Amount (KES)", { x: 460, y: y + 4, size: 10, font: bold, color: rgb(1, 1, 1) });
  y -= 24;

  const rows = [
    { d: `${q.package_name} package – ushering services`, qty: q.number_of_ushers, rate: q.package_price_kes, amt: subtotal },
    { d: "Transport (host pays)", qty: q.number_of_ushers, rate: q.transport_kes ? Math.round(q.transport_kes / q.number_of_ushers) : 0, amt: q.transport_kes },
  ];
  for (const r of rows) {
    page.drawText(r.d, { x: 50, y, size: 10, font, color: navy });
    page.drawText(String(r.qty), { x: 320, y, size: 10, font, color: navy });
    page.drawText(r.rate.toLocaleString(), { x: 380, y, size: 10, font, color: navy });
    page.drawText(r.amt.toLocaleString(), { x: 460, y, size: 10, font, color: navy });
    y -= 18;
  }

  y -= 10;
  page.drawLine({ start: { x: 320, y }, end: { x: 555, y }, color: gray, thickness: 0.5 });
  y -= 16;
  page.drawText("TOTAL", { x: 380, y, size: 12, font: bold, color: navy });
  page.drawText(`KES ${total.toLocaleString()}`, { x: 460, y, size: 12, font: bold, color: gold });
  y -= 30;

  if (q.notes) {
    page.drawText("Notes:", { x: 40, y, size: 10, font: bold, color: navy }); y -= 14;
    page.drawText(q.notes.slice(0, 500), { x: 40, y, size: 9, font, color: gray, maxWidth: 515 });
    y -= 40;
  }

  page.drawText("Host provides lunch for all ushers. Transport billed separately.", { x: 40, y: 80, size: 9, font, color: gray });
  page.drawText("Quote valid for 14 days. Confirm by replying to this email or call 0112 836 281.", { x: 40, y: 66, size: 9, font, color: gray });
  page.drawText("Smart Ushering • Nairobi, Kenya", { x: 40, y: 40, size: 8, font, color: gray });

  const bytes = await pdf.save();
  const path = `quotes/${q.reference}.pdf`;
  const { error } = await supabaseAdmin.storage.from("quotes").upload(path, bytes, {
    contentType: "application/pdf", upsert: true,
  });
  if (error) throw new Error(error.message);
  const { data: signed } = await supabaseAdmin.storage.from("quotes").createSignedUrl(path, 60 * 60 * 24 * 30);
  return { path, signedUrl: signed?.signedUrl ?? "" };
}
