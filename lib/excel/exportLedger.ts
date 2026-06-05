import * as XLSX from "xlsx";

export interface LedgerExportRow {
  date: string | Date;
  voucherNo: string;
  type: "RECEIPT" | "PAYMENT" | "BOOKING";
  name: string;
  headName: string;
  categoryName: string;
  paymentType: string;
  referenceDetails: string;
  amount: number;
  notes: string;
}

export function exportLedgerToExcel(data: LedgerExportRow[], filename = "ledger_report.xlsx") {
  // 1. Map rows into standard column format
  const wsData = data.map((row) => {
    const formattedDate = new Date(row.date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    return {
      "Date": formattedDate,
      "Voucher No": row.voucherNo,
      "Type": row.type,
      "Name / Party": row.name,
      "Ledger Head": row.headName,
      "Ledger Category": row.categoryName,
      "Payment Mode": row.paymentType,
      "Reference Info": row.referenceDetails,
      "Receipt (INR)": (row.type === "RECEIPT" || row.type === "BOOKING") ? row.amount : 0,
      "Payment (INR)": row.type === "PAYMENT" ? row.amount : 0,
      "Remarks / Notes": row.notes || "",
    };
  });

  // 2. Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(wsData);

  // 3. Auto-size columns to look professional and legible
  const colWidths = [
    { wch: 12 }, // Date
    { wch: 18 }, // Voucher No
    { wch: 10 }, // Type
    { wch: 28 }, // Name / Party
    { wch: 20 }, // Ledger Head
    { wch: 22 }, // Ledger Category
    { wch: 15 }, // Payment Mode
    { wch: 25 }, // Reference Info
    { wch: 15 }, // Receipt (INR)
    { wch: 15 }, // Payment (INR)
    { wch: 35 }, // Remarks / Notes
  ];
  worksheet["!cols"] = colWidths;

  // 4. Create workbook and append sheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Ledger Report");

  // 5. Trigger download in browser
  XLSX.writeFile(workbook, filename);
}
