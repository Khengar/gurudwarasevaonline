import jsPDF from "jspdf";
import autoTable, { RowInput } from "jspdf-autotable";
import { toWords } from "number-to-words-en";

export interface ReceiptOrPaymentPrintData {
  type: "RECEIPT" | "PAYMENT";
  voucherNo: string;
  date: string | Date;
  name: string;
  categoryName: string;
  amount: number;
  paymentType: string;
  chequeNo?: string | null;
  bankName?: string | null;
  transactionId?: string | null;
  notes?: string | null;
}

function capitalizeWords(str: string): string {
  if (!str) return "";
  return str
    .split(/[\s-]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function generateReceiptPdf(
  data: ReceiptOrPaymentPrintData,
  trustName: string,
  trustAddress?: string | null,
  trustPhone?: string | null
) {
  // A5 Landscape Dimensions: Width = 210mm, Height = 148mm
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a5",
  });

  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  // 1. Header background styling (subtle top amber accent border)
  doc.setFillColor(217, 119, 6); // Amber 600: #d97706
  doc.rect(0, 0, width, 5, "F");

  // 2. Trust Name & Subtitle
  doc.setTextColor(30, 41, 59); // Slate 800
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(trustName.toUpperCase(), width / 2, 11, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // Slate 500
  
  let headerY = 15;
  if (trustAddress || trustPhone) {
    const subParts = [];
    if (trustAddress) subParts.push(trustAddress);
    if (trustPhone) subParts.push(`Phone: ${trustPhone}`);
    doc.text(subParts.join(" | ").toUpperCase(), width / 2, headerY, { align: "center" });
    headerY += 4;
  }
  doc.text("GURUDWARA SEVA ONLINE LEDGER MANAGEMENT SYSTEM", width / 2, headerY, { align: "center" });

  // Draw horizontal divider line
  const dividerY = headerY + 3;
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.setLineWidth(0.5);
  doc.line(10, dividerY, width - 10, dividerY);

  // 3. Voucher Title Banner
  const title = data.type === "RECEIPT" ? "RECEIPT VOUCHER" : "PAYMENT VOUCHER";
  doc.setFillColor(248, 250, 252); // Slate 50
  const bannerY = dividerY + 3;
  doc.rect(10, bannerY, width - 20, 8, "F");
  
  doc.setTextColor(217, 119, 6); // Amber 600
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(title, width / 2, bannerY + 5.5, { align: "center" });

  // 4. Details table body mapping
  const formattedDate = new Date(data.date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const amountInWords = capitalizeWords(toWords(data.amount)) + " Rupees Only";
  
  const paymentDetails = [];
  if (data.paymentType === "CHEQUE" && data.chequeNo) {
    paymentDetails.push(`Cheque No: ${data.chequeNo}`);
    if (data.bankName) paymentDetails.push(`Bank: ${data.bankName}`);
  } else if ((data.paymentType === "UPI" || data.paymentType === "ONLINE") && data.transactionId) {
    paymentDetails.push(`Txn ID: ${data.transactionId}`);
  }
  const paymentMethodLabel = data.paymentType + (paymentDetails.length > 0 ? ` (${paymentDetails.join(", ")})` : "");

  const tableRows: RowInput[] = [
    [
      { content: "Voucher Number:", styles: { fontStyle: "bold" as const, textColor: [100, 116, 139] } },
      { content: data.voucherNo, styles: { textColor: [30, 41, 59] } },
      { content: "Date:", styles: { fontStyle: "bold" as const, textColor: [100, 116, 139] } },
      { content: formattedDate, styles: { textColor: [30, 41, 59] } },
    ],
    [
      { content: data.type === "RECEIPT" ? "Received From:" : "Paid To:", styles: { fontStyle: "bold" as const, textColor: [100, 116, 139] } },
      { content: data.name.toUpperCase(), styles: { fontStyle: "bold" as const, textColor: [30, 41, 59] }, colSpan: 3 },
    ],
    [
      { content: "Category / Head:", styles: { fontStyle: "bold" as const, textColor: [100, 116, 139] } },
      { content: data.categoryName, styles: { textColor: [30, 41, 59] } },
      { content: "Payment Method:", styles: { fontStyle: "bold" as const, textColor: [100, 116, 139] } },
      { content: paymentMethodLabel, styles: { textColor: [30, 41, 59] } },
    ],
    [
      { content: "Amount in Figures:", styles: { fontStyle: "bold" as const, textColor: [100, 116, 139] } },
      { content: `INR ${data.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, styles: { fontStyle: "bold" as const, textColor: [217, 119, 6] }, colSpan: 3 },
    ],
    [
      { content: "Amount in Words:", styles: { fontStyle: "bold" as const, textColor: [100, 116, 139] } },
      { content: amountInWords, styles: { fontStyle: "italic" as const, textColor: [30, 41, 59] }, colSpan: 3 },
    ],
  ];

  if (data.notes) {
    tableRows.push([
      { content: "Remarks / Notes:", styles: { fontStyle: "bold" as const, textColor: [100, 116, 139] } },
      { content: data.notes, styles: { textColor: [71, 85, 105] }, colSpan: 3 },
    ]);
  }

  const tableStartY = bannerY + 11;

  // Draw the details using jspdf-autotable
  autoTable(doc, {
    startY: tableStartY,
    margin: { left: 10, right: 10 },
    theme: "plain",
    body: tableRows,
    styles: {
      fontSize: 9,
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 60 },
      2: { cellWidth: 35 },
      3: { cellWidth: 60 },
    },
  });

  // 5. Footer and signatures
  const sigY = height - 20;
  doc.setDrawColor(241, 245, 249); // Slate 100
  doc.line(10, sigY - 2, width - 10, sigY - 2);

  // Exemption Text (for receipts only, or general for all if requested)
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184); // Slate 400
  if (data.type === "RECEIPT") {
    doc.text("Donations are exempt under section 80G of the Income Tax Act.", 10, sigY + 4);
  }

  // Signature line
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105); // Slate 600
  doc.text("Authorized Signature", width - 10, sigY + 4, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("GurSewa Online System", width - 10, sigY + 8, { align: "right" });

  // Save the PDF
  doc.save(`${data.type.toLowerCase()}-${data.voucherNo.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`);
}
