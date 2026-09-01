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
  /** Per-date usher counts */
  date_ushers?: Array<{ date: string; ushers: number }>;
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
  const breakdown = (q.date_ushers && q.date_ushers.length
    ? q.date_ushers
    : (q.event_dates ?? []).map((d) => ({ date: d, ushers: q.number_of_ushers }))
  ).filter((b) => b.date);
  const entries = breakdown.length ? breakdown : [{ date: q.event_date ?? "TBD", ushers: q.number_of_ushers }];
  const days = Math.max(1, entries.length);
  const usherDays = entries.reduce((s, b) => s + b.ushers, 0);
  const subtotal = q.package_price_kes * usherDays;
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
  const dateList = entries.map((e) => e.date);
  const datesLabel = dateList.length
    ? dateList.join(", ").slice(0, 90)
    : (q.event_date ?? "TBD");
  const usherRange = (() => {
    const min = Math.min(...entries.map((e) => e.ushers));
    const max = Math.max(...entries.map((e) => e.ushers));
    return min === max ? `${max} per day` : `${min}–${max} per day (${usherDays} usher-days)`;
  })();
  const lines: Array<[string, string]> = [
    ["Event Type", q.event_type],
    [dateList.length > 1 ? "Event Dates" : "Event Date", datesLabel],
    ["Duration", `${days} day${days > 1 ? "s" : ""}`],
    ["Venue", q.venue ?? "TBD"],
    ["County", q.county ?? "TBD"],
    ["Package", q.package_name],
    ["Number of Ushers", usherRange],
  ];
  for (const [k, v] of lines) {
    page.drawText(k, { x: 40, y, size: 10, font: bold, color: navy });
    page.drawText(v, { x: 200, y, size: 10, font, color: gray });
    y -= 16;
  }
  y -= 10;

  // Cost table — one row per event date
  const COL_DESC = 48;
  const COL_QTY_R = 372;   // right edge of Ushers column
  const COL_RATE_R = 455;  // right edge of Rate column
  const COL_AMT_R = 547;   // right edge of Amount column
  const right = (text: string, xRight: number, size: number, f = font, color = navy, yy = y) =>
    page.drawText(text, { x: xRight - f.widthOfTextAtSize(text, size), y: yy, size, font: f, color });

  page.drawRectangle({ x: 40, y: y - 6, width: 515, height: 26, color: navy });
  page.drawText("Event day", { x: COL_DESC + 2, y: y + 3, size: 9, font: bold, color: rgb(1, 1, 1) });
  right("Ushers", COL_QTY_R, 9, bold, rgb(1, 1, 1), y + 3);
  right("Rate / usher / day", COL_RATE_R, 9, bold, rgb(1, 1, 1), y + 3);
  right("Amount (KES)", COL_AMT_R, 9, bold, rgb(1, 1, 1), y + 3);
  y -= 30;

  const perUsherDay = q.package_price_kes + q.transport_rate_kes;
  for (const [i, e] of entries.entries()) {
    if (y < 190) {
      page.drawText(`+ ${entries.length - i} more day(s) — see summary below`, { x: COL_DESC + 2, y, size: 9, font, color: gray });
      y -= 18;
      break;
    }
    const amt = e.ushers * perUsherDay;
    page.drawText(`Day ${i + 1} — ${e.date}`, { x: COL_DESC + 2, y, size: 10, font: bold, color: navy, maxWidth: 250 });
    right(String(e.ushers), COL_QTY_R, 10, font, navy, y);
    right(perUsherDay.toLocaleString(), COL_RATE_R, 10, font, navy, y);
    right(amt.toLocaleString(), COL_AMT_R, 10, bold, navy, y);
    y -= 13;
    page.drawText(
      `${e.ushers} usher${e.ushers > 1 ? "s" : ""} x KES ${q.package_price_kes.toLocaleString()} ushering + KES ${q.transport_rate_kes.toLocaleString()} transport (per usher, per day)`,
      { x: COL_DESC + 2, y, size: 8, font, color: gray, maxWidth: 300 },
    );
    y -= 12;
    page.drawLine({ start: { x: 40, y }, end: { x: 555, y }, color: rgb(0.88, 0.88, 0.9), thickness: 0.5 });
    y -= 14;
  }


  y -= 2;
  page.drawText("Subtotal (ushering)", { x: 300, y, size: 10, font, color: gray });
  right(`KES ${subtotal.toLocaleString()}`, COL_AMT_R, 10, font, navy, y);
  y -= 15;
  page.drawText("Transport total", { x: 300, y, size: 10, font, color: gray });
  right(`KES ${q.transport_kes.toLocaleString()}`, COL_AMT_R, 10, font, navy, y);
  y -= 12;
  page.drawLine({ start: { x: 300, y }, end: { x: 555, y }, color: gray, thickness: 0.5 });
  y -= 22;
  page.drawRectangle({ x: 300, y: y - 8, width: 255, height: 26, color: navy });
  page.drawText("TOTAL", { x: 312, y, size: 12, font: bold, color: rgb(1, 1, 1) });
  right(`KES ${total.toLocaleString()}`, COL_AMT_R, 12, bold, gold, y);
  y -= 34;


  if (q.notes) {
    page.drawText("Notes:", { x: 40, y, size: 10, font: bold, color: navy }); y -= 14;
    page.drawText(q.notes.slice(0, 500), { x: 40, y, size: 9, font, color: gray, maxWidth: 515 });
    y -= 40;
  }

  page.drawText("Host provides lunch for all ushers. Transport billed separately.", { x: 40, y: 80, size: 9, font, color: gray });
  page.drawText(
    q.valid_until
      ? `Quote valid until ${q.valid_until}. Confirm by replying to this email or call 0112 836 281.`
      : "Confirm by replying to this email or call 0112 836 281.",
    { x: 40, y: 66, size: 9, font, color: gray },
  );
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
