"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  ColumnDef,
  flexRender,
  SortingState,
} from "@tanstack/react-table";
import { format } from "date-fns";
import {
  Search,
  Calendar,
  FileSpreadsheet,
  Printer,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Layers,
  Info,
  Loader2,
} from "lucide-react";
import { useDashboardStore } from "@/lib/store/useDashboardStore";
import { generateReceiptPdf } from "@/lib/pdf/generateReceipt";
import { exportLedgerToExcel } from "@/lib/excel/exportLedger";

// --- TYPES DEFINITION ---
interface Category {
  id: string;
  name: string;
  namePunjabi: string | null;
}

interface CategoryHead {
  id: string;
  name: string;
  namePunjabi: string | null;
  type: "RECEIPT" | "PAYMENT";
  categories: Category[];
}

interface Receipt {
  id: string;
  receiptNo: string;
  fullName: string;
  amount: string;
  paymentType: string;
  chequeNo: string | null;
  bankName: string | null;
  transactionId: string | null;
  notes: string | null;
  date: string;
  category: {
    name: string;
    head: {
      id: string;
      name: string;
    };
  };
}

interface Payment {
  id: string;
  paymentNo: string;
  payeeName: string;
  amount: string;
  paymentType: string;
  chequeNo: string | null;
  bankName: string | null;
  transactionId: string | null;
  notes: string | null;
  date: string;
  category: {
    name: string;
    head: {
      id: string;
      name: string;
    };
  };
}

interface Booking {
  id: string;
  bookingNo: string;
  guestName: string;
  checkIn: string;
  advancePaid: string;
  paymentStatus: string;
  notes: string | null;
  room: {
    roomNumber: string;
    type: string;
  };
}

interface LedgerItem {
  id: string;
  date: string;
  type: "RECEIPT" | "PAYMENT" | "BOOKING";
  voucherNo: string;
  name: string;
  headId: string;
  headName: string;
  categoryName: string;
  paymentType: string;
  chequeNo: string | null;
  bankName: string | null;
  transactionId: string | null;
  notes: string | null;
  amount: number;
}

export default function ReportGenerator() {
  const { currentTrust } = useDashboardStore();

  // Helper date defaults
  const getStartOfMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}-01`;
  };

  const getToday = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Filter States
  const [fromDate, setFromDate] = useState(getStartOfMonth());
  const [toDate, setToDate] = useState(getToday());
  const [selectedHeadId, setSelectedHeadId] = useState("");
  const [transactionType, setTransactionType] = useState("ALL");
  const [paymentMethod, setPaymentMethod] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [sorting, setSorting] = useState<SortingState>([
    { id: "date", desc: true },
  ]);

  // --- API QUERIES ---
  const { data: trustSettings } = useQuery({
    queryKey: ["trustSettings"],
    queryFn: async () => {
      const res = await fetch("/api/settings");
      const json = await res.json();
      return json.success ? json.data : null;
    },
  });

  const { data: categoryHeads = [] } = useQuery<CategoryHead[]>({
    queryKey: ["category-heads"],
    queryFn: async () => {
      const res = await fetch("/api/category-heads");
      const json = await res.json();
      return json.data || [];
    },
  });

  const { data: receipts = [], isLoading: isLoadingReceipts } = useQuery<Receipt[]>({
    queryKey: ["receipts"],
    queryFn: async () => {
      const res = await fetch("/api/receipts");
      const json = await res.json();
      return json.data || [];
    },
  });

  const { data: payments = [], isLoading: isLoadingPayments } = useQuery<Payment[]>({
    queryKey: ["payments"],
    queryFn: async () => {
      const res = await fetch("/api/payments");
      const json = await res.json();
      return json.data || [];
    },
  });

  const { data: bookings = [], isLoading: isLoadingBookings } = useQuery<Booking[]>({
    queryKey: ["bookings"],
    queryFn: async () => {
      const res = await fetch("/api/bookings");
      const json = await res.json();
      return json.data || [];
    },
  });

  // --- COMBINE DATA ---
  const ledgerItems = React.useMemo<LedgerItem[]>(() => {
    const combined: LedgerItem[] = [];

    receipts.forEach((r) => {
      combined.push({
        id: r.id,
        date: r.date,
        type: "RECEIPT",
        voucherNo: r.receiptNo,
        name: r.fullName,
        headId: r.category.head.id,
        headName: r.category.head.name,
        categoryName: r.category.name,
        paymentType: r.paymentType,
        chequeNo: r.chequeNo,
        bankName: r.bankName,
        transactionId: r.transactionId,
        notes: r.notes,
        amount: parseFloat(r.amount),
      });
    });

    payments.forEach((p) => {
      combined.push({
        id: p.id,
        date: p.date,
        type: "PAYMENT",
        voucherNo: p.paymentNo,
        name: p.payeeName,
        headId: p.category.head.id,
        headName: p.category.head.name,
        categoryName: p.category.name,
        paymentType: p.paymentType,
        chequeNo: p.chequeNo,
        bankName: p.bankName,
        transactionId: p.transactionId,
        notes: p.notes,
        amount: parseFloat(p.amount),
      });
    });

    bookings.forEach((b) => {
      combined.push({
        id: b.id,
        date: b.checkIn,
        type: "BOOKING",
        voucherNo: b.bookingNo,
        name: b.guestName,
        headId: "booking",
        headName: "Room Booking",
        categoryName: `Room ${b.room.roomNumber} (${b.room.type})`,
        paymentType: b.paymentStatus,
        chequeNo: null,
        bankName: null,
        transactionId: null,
        notes: b.notes,
        amount: parseFloat(b.advancePaid || "0"),
      });
    });

    return combined;
  }, [receipts, payments, bookings]);

  // --- FILTER COMBINED DATA ---
  const filteredLedger = React.useMemo(() => {
    return ledgerItems.filter((item) => {
      // 1. Date Range
      const itemTime = new Date(item.date).getTime();
      if (fromDate) {
        const fromTime = new Date(fromDate + "T00:00:00").getTime();
        if (itemTime < fromTime) return false;
      }
      if (toDate) {
        const toTime = new Date(toDate + "T23:59:59").getTime();
        if (itemTime > toTime) return false;
      }

      // 2. Transaction Type
      if (transactionType !== "ALL" && item.type !== transactionType) {
        return false;
      }

      // 3. Category Head Group
      if (selectedHeadId && item.headId !== selectedHeadId) {
        return false;
      }

      // 4. Search Filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const voucherNoMatch = item.voucherNo.toLowerCase().includes(search);
        const nameMatch = item.name.toLowerCase().includes(search);
        const notesMatch = item.notes?.toLowerCase().includes(search) || false;
        const categoryMatch =
          item.categoryName.toLowerCase().includes(search) ||
          item.headName.toLowerCase().includes(search);

        if (!voucherNoMatch && !nameMatch && !notesMatch && !categoryMatch) {
          return false;
        }
      }

      // 5. Payment Method Filter
      if (paymentMethod !== "ALL") {
        if (paymentMethod === "NEFT/RTGS") {
          if (item.paymentType !== "NEFT" && item.paymentType !== "RTGS") {
            return false;
          }
        } else if (item.paymentType !== paymentMethod) {
          return false;
        }
      }

      return true;
    });
  }, [ledgerItems, fromDate, toDate, transactionType, selectedHeadId, searchTerm, paymentMethod]);

  // --- CALCULATE SUMMARY TOTALS ---
  const { totalReceipts, totalPayments, netBalance, txnCount } = React.useMemo(() => {
    let receiptsSum = 0;
    let paymentsSum = 0;
    filteredLedger.forEach((item) => {
      if (item.type === "RECEIPT" || item.type === "BOOKING") {
        receiptsSum += item.amount;
      } else if (item.type === "PAYMENT") {
        paymentsSum += item.amount;
      }
    });

    return {
      totalReceipts: receiptsSum,
      totalPayments: paymentsSum,
      netBalance: receiptsSum - paymentsSum,
      txnCount: filteredLedger.length,
    };
  }, [filteredLedger]);

  // --- EXCEL EXPORT TRIGGER ---
  const handleExportExcel = () => {
    const exportData = filteredLedger.map((item) => {
      const refDetails = [];
      if (item.chequeNo) refDetails.push(`Chq: ${item.chequeNo}`);
      if (item.bankName) refDetails.push(`Bank: ${item.bankName}`);
      if (item.transactionId) refDetails.push(`Txn: ${item.transactionId}`);

      return {
        date: item.date,
        voucherNo: item.voucherNo,
        type: item.type,
        name: item.name,
        headName: item.headName,
        categoryName: item.categoryName,
        paymentType: item.paymentType,
        referenceDetails: refDetails.join(" | "),
        amount: item.amount,
        notes: item.notes || "",
      };
    });

    const filename = `ledger_${currentTrust.id}_${fromDate}_to_${toDate}.xlsx`;
    exportLedgerToExcel(exportData, filename);
  };

  // --- PRINT PDF TRIGGER ---
  const handlePrint = React.useCallback((item: LedgerItem) => {
    generateReceiptPdf(
      {
        type: item.type === "BOOKING" ? "RECEIPT" : item.type,
        voucherNo: item.voucherNo,
        date: item.date,
        name: item.name,
        categoryName: `${item.headName} - ${item.categoryName}`,
        amount: item.amount,
        paymentType: item.paymentType,
        chequeNo: item.chequeNo,
        bankName: item.bankName,
        transactionId: item.transactionId,
        notes: item.notes,
      },
      trustSettings?.name || currentTrust.name,
      trustSettings?.address,
      trustSettings?.phone
    );
  }, [currentTrust, trustSettings]);

  // --- TABLE COLUMNS DEFINITION ---
  const columns = React.useMemo<ColumnDef<LedgerItem>[]>(
    () => [
      {
        accessorKey: "date",
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <span>Date</span>
            <ArrowUpDown className="h-3.5 w-3.5" />
          </button>
        ),
        cell: (info) => {
          const val = info.getValue() as string;
          return (
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {format(new Date(val), "dd MMM yyyy")}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "voucherNo",
        header: "Voucher / Ref No",
        cell: (info) => {
          const row = info.row.original;
          return (
            <span
              className={`font-bold ${
                row.type === "RECEIPT"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {info.getValue() as string}
            </span>
          );
        },
      },
      {
        accessorKey: "type",
        header: "Type",
        cell: (info) => {
          const val = info.getValue() as string;
          return (
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold ${
                val === "RECEIPT"
                  ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
                  : "bg-rose-500/10 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400"
              }`}
            >
              {val}
            </span>
          );
        },
      },
      {
        accessorKey: "name",
        header: "Party Name",
        cell: (info) => (
          <span className="font-bold text-slate-900 dark:text-white uppercase">
            {info.getValue() as string}
          </span>
        ),
      },
      {
        id: "category",
        header: "Ledger Head & Category",
        accessorFn: (row) => `${row.headName} - ${row.categoryName}`,
        cell: (info) => {
          const row = info.row.original;
          return (
            <div>
              <p className="text-[9px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
                {row.headName}
              </p>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {row.categoryName}
              </p>
            </div>
          );
        },
      },
      {
        accessorKey: "paymentType",
        header: "Mode",
        cell: (info) => {
          const row = info.row.original;
          const details = [];
          if (row.chequeNo) details.push(`Chq ${row.chequeNo}`);
          if (row.transactionId) details.push(`Txn ${row.transactionId}`);
          
          return (
            <div>
              <span className="font-semibold text-xs text-slate-700 dark:text-slate-300">
                {info.getValue() as string}
              </span>
              {details.length > 0 && (
                <p className="text-[9px] text-slate-400 dark:text-slate-500">
                  {details.join(" | ")}
                </p>
              )}
            </div>
          );
        },
      },
      {
        id: "receiptAmount",
        header: () => <div className="text-right">Receipt (Dr)</div>,
        cell: (info) => {
          const row = info.row.original;
          if (row.type !== "RECEIPT" && row.type !== "BOOKING") return <span className="text-slate-300 dark:text-slate-700">-</span>;
          return (
            <div className="text-right font-bold text-emerald-600 dark:text-emerald-400">
              INR {row.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
          );
        },
      },
      {
        id: "paymentAmount",
        header: () => <div className="text-right">Payment (Cr)</div>,
        cell: (info) => {
          const row = info.row.original;
          if (row.type !== "PAYMENT") return <span className="text-slate-300 dark:text-slate-700">-</span>;
          return (
            <div className="text-right font-bold text-rose-600 dark:text-rose-400">
              INR {row.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
          );
        },
      },
      {
        id: "actions",
        header: () => <div className="text-right">Actions</div>,
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="flex items-center justify-end gap-1.5">
              <button
                onClick={() => handlePrint(row)}
                title="Print PDF Receipt"
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 rounded-lg transition-colors"
              >
                <Printer className="h-4 w-4" />
              </button>
            </div>
          );
        },
      },
    ],
    [handlePrint]
  );

  const table = useReactTable({
    data: filteredLedger,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const isLoading = isLoadingReceipts || isLoadingPayments || isLoadingBookings;

  return (
    <div className="space-y-6">
      {/* --- FILTER CONTROL PANEL --- */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <Layers className="h-4.5 w-4.5 text-amber-500" />
          <span>Ledger Filter Controls</span>
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-6 items-end">
          {/* From Date */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>From Date</span>
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-slate-800 dark:text-white outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all"
            />
          </div>

          {/* To Date */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>To Date</span>
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-slate-800 dark:text-white outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all"
            />
          </div>

          {/* Transaction Type */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Transaction Type
            </label>
            <select
              value={transactionType}
              onChange={(e) => setTransactionType(e.target.value)}
              className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2.5 text-slate-800 dark:text-white outline-none focus:border-amber-500 transition-all"
            >
              <option value="ALL">ALL TRANSACTIONS</option>
              <option value="RECEIPT">RECEIPTS (DEBIT)</option>
              <option value="PAYMENT">PAYMENTS (CREDIT)</option>
              <option value="BOOKING">BOOKINGS (ADVANCES)</option>
            </select>
          </div>

          {/* Category Head Group */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Ledger Head Filter
            </label>
            <select
              value={selectedHeadId}
              onChange={(e) => setSelectedHeadId(e.target.value)}
              className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2.5 text-slate-800 dark:text-white outline-none focus:border-amber-500 transition-all"
            >
              <option value="">-- ALL LEDGER HEADS --</option>
              {categoryHeads.map((head) => (
                <option key={head.id} value={head.id}>
                  {head.type === "RECEIPT" ? "[DR]" : "[CR]"} {head.name}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Method Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2.5 text-slate-800 dark:text-white outline-none focus:border-amber-500 transition-all"
            >
              <option value="ALL">ALL METHODS</option>
              <option value="CASH">CASH</option>
              <option value="CHEQUE">CHEQUE</option>
              <option value="UPI">UPI</option>
              <option value="ONLINE">ONLINE</option>
              <option value="NEFT/RTGS">NEFT / RTGS</option>
            </select>
          </div>

          {/* Search Term */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Text Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search party, voucher..."
                className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 pl-9 pr-3 py-2.5 text-slate-800 dark:text-white outline-none focus:border-amber-500 transition-colors"
              />
            </div>
          </div>
        </div>
      </div>

      {/* --- SUMMARY STATS CARDS --- */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Receipts */}
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-emerald-500/5 dark:bg-emerald-500/10 p-5 flex items-center justify-between shadow-sm border-l-4 border-l-emerald-500">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Total Receipts (Dr)
            </p>
            <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              INR {totalReceipts.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <TrendingUp className="h-9 w-9 text-emerald-500 opacity-60" />
        </div>

        {/* Total Payments */}
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-rose-500/5 dark:bg-rose-500/10 p-5 flex items-center justify-between shadow-sm border-l-4 border-l-rose-500">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Total Payments (Cr)
            </p>
            <h3 className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1">
              INR {totalPayments.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <TrendingDown className="h-9 w-9 text-rose-500 opacity-60" />
        </div>

        {/* Net Balance */}
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-amber-500/5 dark:bg-amber-500/10 p-5 flex items-center justify-between shadow-sm border-l-4 border-l-amber-500">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Net Ledger Balance
            </p>
            <h3
              className={`text-xl font-bold mt-1 ${
                netBalance >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              INR {netBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <DollarSign className="h-9 w-9 text-amber-500 opacity-60" />
        </div>

        {/* Transaction Count */}
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-5 flex items-center justify-between shadow-sm border-l-4 border-l-slate-400">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500">
              Voucher Count
            </p>
            <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mt-1">
              {txnCount} entries
            </h3>
          </div>
          <Info className="h-9 w-9 text-slate-400 opacity-60" />
        </div>
      </div>

      {/* --- TABLE LEDGER VIEW --- */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        {/* Table Header Controls */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/40">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Combined Cash / Bank Ledger
            </h3>
            <p className="text-xs text-slate-450 dark:text-slate-550 mt-0.5">
              Showing entries from {fromDate || "all dates"} to {toDate || "today"}.
            </p>
          </div>

          <button
            onClick={handleExportExcel}
            disabled={filteredLedger.length === 0}
            className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/40 text-white px-4 py-2.5 text-xs font-bold shadow-sm transition-colors"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Export Sheet (.xlsx)</span>
          </button>
        </div>

        {/* Render State */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Processing ledger transactions...
            </p>
          </div>
        ) : filteredLedger.length === 0 ? (
          <div className="text-center py-20 text-slate-450 dark:text-slate-550">
            <Info className="h-10 w-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
            <p className="text-xs font-bold uppercase tracking-wider">No Ledger Entries Found</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 max-w-xs mx-auto">
              No receipts or payments match the active filter criteria. Try adjusting dates or query strings.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                {table.getHeaderGroups().map((group) => (
                  <tr
                    key={group.id}
                    className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60"
                  >
                    {group.headers.map((header) => (
                      <th
                        key={header.id}
                        className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500"
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm font-medium">
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-850/30 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-3 py-2 text-slate-700 dark:text-slate-350">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-450">
              <span className="text-[10px] uppercase tracking-wider">
                Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()} (
                {filteredLedger.length} records total)
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="p-1.5 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-400 disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="h-4.5 w-4.5" />
                </button>
                <button
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="p-1.5 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-400 disabled:opacity-40 transition-colors"
                >
                  <ChevronRight className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
