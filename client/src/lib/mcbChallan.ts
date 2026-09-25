import { PDFDocument, PDFFont, PDFImage, PDFPage, StandardFonts, rgb } from "pdf-lib";

export type McbChallanPrefill = {
  applicationNo: string;
  challanNo: string;
  dateLabel: string;
  name: string;
  fatherName: string;
  surname: string;
  cnic: string;
  program: string;
  mobile: string;
};

export const MCB_CHALLAN = {
  bankName: "MCB Bank Ltd",
  university: "University of Sufism and Modern Sciences, Bhitshah",
  accountNo: "1171267781003178",
  category: "MERIT/GENERAL CATEGORY",
  feeLabel: "Rs. 3,000/-",
  feeWords: "Three Thousand Only",
  description: "Application Processing/Pre-Entry Test Fees For Undergraduate Programs",
} as const;

const COPIES = ["Account's Copy", "Admission's Copy", "Candidate's Copy", "Bank's Copy"] as const;
const MCB_ICON_PATH = "/challan/mcb-icon.png";

const ink = rgb(0.05, 0.05, 0.08);
const white = rgb(1, 1, 1);

export function splitSurname(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return { given: fullName.trim(), surname: "" };
  }
  return {
    given: parts.slice(0, -1).join(" "),
    surname: parts[parts.length - 1] ?? "",
  };
}

export function nextChallanNo(applicationNo: string) {
  const suffix = applicationNo.replace(/\D/g, "").slice(-6) || String(Date.now()).slice(-6);
  return `MCB-${suffix}`;
}

function clip(value: string, max: number) {
  const text = value.trim().toUpperCase();
  return text.length > max ? text.slice(0, max) : text;
}

function fitText(font: PDFFont, text: string, size: number, maxWidth: number) {
  const clean = text.trim();
  if (!clean) {
    return "";
  }
  if (font.widthOfTextAtSize(clean, size) <= maxWidth) {
    return clean;
  }
  let next = clean;
  while (next.length > 1 && font.widthOfTextAtSize(`${next}…`, size) > maxWidth) {
    next = next.slice(0, -1);
  }
  return `${next}…`;
}

function drawCentered(page: PDFPage, text: string, x: number, y: number, width: number, size: number, font: PDFFont, color = ink) {
  const textWidth = font.widthOfTextAtSize(text, size);
  page.drawText(text, {
    x: x + Math.max(0, (width - textWidth) / 2),
    y,
    size,
    font,
    color,
  });
}

function drawRule(page: PDFPage, x: number, y: number, width: number) {
  page.drawLine({
    start: { x, y },
    end: { x: x + width, y },
    thickness: 0.7,
    color: ink,
  });
}

function drawBlackBar(page: PDFPage, x: number, y: number, width: number, height: number, label: string, font: PDFFont, size: number) {
  page.drawRectangle({
    x,
    y,
    width,
    height,
    color: ink,
  });
  drawCentered(page, label, x, y + (height - size) / 2 + 0.5, width, size, font, white);
}

function drawMcbLogo(page: PDFPage, logo: PDFImage | undefined, cx: number, top: number, font: PDFFont) {
  if (logo) {
    const maxW = 52;
    const maxH = 36;
    const scale = Math.min(maxW / logo.width, maxH / logo.height);
    const w = logo.width * scale;
    const h = logo.height * scale;
    page.drawImage(logo, {
      x: cx - w / 2,
      y: top - h,
      width: w,
      height: h,
    });
    return h + 4;
  }

  drawCentered(page, "MCB", cx - 18, top - 14, 36, 11, font);
  drawCentered(page, MCB_CHALLAN.bankName, cx - 42, top - 24, 84, 7, font);
  return 28;
}

function drawField(
  page: PDFPage,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number,
  labelFont: PDFFont,
  valueFont: PDFFont,
) {
  const labelSize = 7;
  const valueSize = 7.4;
  const labelWidth = labelFont.widthOfTextAtSize(label, labelSize);
  page.drawText(label, { x, y: y + 1.5, size: labelSize, font: labelFont, color: ink });
  const ruleX = x + labelWidth + 4;
  const ruleWidth = Math.max(24, width - labelWidth - 4);
  drawRule(page, ruleX, y, ruleWidth);
  if (value) {
    page.drawText(fitText(valueFont, value, valueSize, ruleWidth - 2), {
      x: ruleX + 1,
      y: y + 1.8,
      size: valueSize,
      font: valueFont,
      color: ink,
    });
  }
}

function drawCopy(
  page: PDFPage,
  copyLabel: string,
  box: { x: number; y: number; width: number; height: number },
  data: McbChallanPrefill,
  fonts: { roman: PDFFont; romanBold: PDFFont; sansBold: PDFFont },
  logo?: PDFImage,
) {
  const { x, y, width, height } = box;
  const pad = 6;
  const innerX = x + pad;
  const innerW = width - pad * 2;
  let cursor = y + height - 10;

  page.drawRectangle({
    x,
    y,
    width,
    height,
    borderWidth: 1.1,
    borderColor: ink,
  });

  page.drawText("Bank Challan", { x: innerX, y: cursor, size: 8, font: fonts.romanBold, color: ink });
  const copyWidth = fonts.roman.widthOfTextAtSize(`(${copyLabel})`, 6.5);
  page.drawText(`(${copyLabel})`, {
    x: x + width - pad - copyWidth,
    y: cursor,
    size: 6.5,
    font: fonts.roman,
    color: ink,
  });

  cursor -= 12;
  page.drawText("No.", { x: innerX, y: cursor, size: 7, font: fonts.romanBold, color: ink });
  drawRule(page, innerX + 16, cursor, 54);
  page.drawText(clip(data.challanNo, 14), {
    x: innerX + 18,
    y: cursor + 1.5,
    size: 7,
    font: fonts.romanBold,
    color: ink,
  });
  const dateLabel = "Date:";
  const dateX = x + width - pad - 78;
  page.drawText(dateLabel, { x: dateX, y: cursor, size: 7, font: fonts.romanBold, color: ink });
  drawRule(page, dateX + 24, cursor, 54);
  page.drawText(clip(data.dateLabel, 12), {
    x: dateX + 26,
    y: cursor + 1.5,
    size: 7,
    font: fonts.romanBold,
    color: ink,
  });

  cursor -= 8;
  const logoH = drawMcbLogo(page, logo, x + width / 2, cursor, fonts.romanBold);
  cursor -= logoH + 6;

  drawCentered(page, MCB_CHALLAN.university, innerX, cursor, innerW, 8, fonts.romanBold);
  cursor -= 10;
  drawCentered(
    page,
    `Please Receive and Credit to ${MCB_CHALLAN.university}`,
    innerX,
    cursor,
    innerW,
    5,
    fonts.roman,
  );

  cursor -= 12;
  drawBlackBar(page, innerX, cursor - 2, innerW, 11, MCB_CHALLAN.category, fonts.sansBold, 6.2);
  cursor -= 16;
  page.drawText(`Admission A/C No: ${MCB_CHALLAN.accountNo}`, {
    x: innerX,
    y: cursor,
    size: 7.2,
    font: fonts.romanBold,
    color: ink,
  });

  cursor -= 14;
  drawCentered(page, "This is a system-generated copy.", innerX, cursor, innerW, 5.8, fonts.romanBold);
  cursor -= 9;
  drawCentered(page, "No stamp or signature of Sectional Head is required.", innerX, cursor, innerW, 5.2, fonts.roman);
  cursor -= 12;
  drawCentered(page, "(Please fill in BLOCK LETTERS)", innerX, cursor, innerW, 5.5, fonts.roman);

  cursor -= 14;
  const fields: Array<[string, string]> = [
    ["Name:", clip(data.name, 24)],
    ["Father's Name:", clip(data.fatherName, 20)],
    ["Surname:", clip(data.surname, 18)],
    ["CNIC No:", clip(data.cnic, 20)],
    ["Program:", clip(data.program, 22)],
    ["Mobile:", clip(data.mobile, 16)],
  ];
  for (const [label, value] of fields) {
    drawField(page, label, value, innerX, cursor, innerW, fonts.romanBold, fonts.romanBold);
    cursor -= 13;
  }

  cursor -= 2;
  const tableTop = cursor + 8;
  const feeCol = 46;
  const descCol = innerW - feeCol;
  const rowH = 28;
  const totalH = 12;
  const headerH = 11;
  page.drawRectangle({
    x: innerX,
    y: tableTop - headerH - rowH - totalH,
    width: innerW,
    height: headerH + rowH + totalH,
    borderWidth: 0.9,
    borderColor: ink,
  });
  page.drawRectangle({
    x: innerX,
    y: tableTop - headerH,
    width: descCol,
    height: headerH,
    color: ink,
  });
  page.drawRectangle({
    x: innerX + descCol,
    y: tableTop - headerH,
    width: feeCol,
    height: headerH,
    color: ink,
  });
  drawCentered(page, "DESCRIPTION", innerX, tableTop - 8.5, descCol, 5.8, fonts.sansBold, white);
  drawCentered(page, "FEE (Rs.)", innerX + descCol, tableTop - 8.5, feeCol, 5.8, fonts.sansBold, white);
  page.drawLine({
    start: { x: innerX + descCol, y: tableTop - headerH - rowH - totalH },
    end: { x: innerX + descCol, y: tableTop },
    thickness: 0.8,
    color: ink,
  });
  page.drawLine({
    start: { x: innerX, y: tableTop - headerH - rowH },
    end: { x: innerX + innerW, y: tableTop - headerH - rowH },
    thickness: 0.8,
    color: ink,
  });

  const descLines = ["Application Processing/Pre-Entry", "Test Fees For Undergraduate", "Programs (Non-Refundable)"];
  descLines.forEach((line, index) => {
    page.drawText(line, {
      x: innerX + 3,
      y: tableTop - headerH - 9 - index * 7,
      size: 5.6,
      font: fonts.roman,
      color: ink,
    });
  });
  drawCentered(page, MCB_CHALLAN.feeLabel, innerX + descCol, tableTop - headerH - 16, feeCol, 6.5, fonts.romanBold);
  page.drawText("Total", {
    x: innerX + descCol - 28,
    y: tableTop - headerH - rowH - 9,
    size: 7,
    font: fonts.romanBold,
    color: ink,
  });
  drawCentered(page, MCB_CHALLAN.feeLabel, innerX + descCol, tableTop - headerH - rowH - 9, feeCol, 6.5, fonts.romanBold);

  cursor = tableTop - headerH - rowH - totalH - 12;
  page.drawText("Rupees (in words):", { x: innerX, y: cursor, size: 6.2, font: fonts.romanBold, color: ink });
  drawRule(page, innerX + 68, cursor, innerW - 68);
  page.drawText(MCB_CHALLAN.feeWords, {
    x: innerX + 70,
    y: cursor + 1.5,
    size: 6.5,
    font: fonts.romanBold,
    color: ink,
  });

  cursor -= 12;
  const bankBoxH = 56;
  drawBlackBar(page, innerX, cursor - 2, innerW, 11, "For Bank Use Only", fonts.sansBold, 6.2);
  cursor -= 13;
  page.drawRectangle({
    x: innerX,
    y: cursor - bankBoxH + 11,
    width: innerW,
    height: bankBoxH - 11,
    borderWidth: 0.9,
    borderColor: ink,
  });
  drawCentered(page, "Signature & Stamp of Bank Official", innerX, cursor - bankBoxH + 16, innerW, 5.8, fonts.roman);
}

async function loadMcbIconBytes(): Promise<Uint8Array | undefined> {
  if (typeof fetch === "function") {
    try {
      const response = await fetch(MCB_ICON_PATH);
      if (!response.ok) {
        return undefined;
      }
      return new Uint8Array(await response.arrayBuffer());
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export async function buildMcbChallanPdf(data: McbChallanPrefill, iconBytes?: Uint8Array): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([841.89, 595.28]);
  const roman = await pdf.embedFont(StandardFonts.TimesRoman);
  const romanBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const sansBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const bytes = iconBytes ?? (await loadMcbIconBytes());
  const logo = bytes ? await pdf.embedPng(bytes) : undefined;
  const margin = 10;
  const gap = 5;
  const usableW = page.getWidth() - margin * 2;
  const usableH = page.getHeight() - margin * 2;
  const colW = (usableW - gap * 3) / 4;

  COPIES.forEach((copyLabel, index) => {
    drawCopy(
      page,
      copyLabel,
      {
        x: margin + index * (colW + gap),
        y: margin,
        width: colW,
        height: usableH,
      },
      data,
      { roman, romanBold, sansBold },
      logo,
    );
  });

  return pdf.save();
}

export async function downloadMcbChallan(data: McbChallanPrefill) {
  const bytes = await buildMcbChallanPdf(data);
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  const blob = new Blob([copy], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const fileName = `USMS_MCB_Challan_${data.applicationNo || "draft"}.pdf`;
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  return { fileName, challanNo: data.challanNo };
}
