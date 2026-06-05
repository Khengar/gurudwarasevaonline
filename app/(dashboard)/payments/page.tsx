"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  ColumnDef,
  flexRender,
  SortingState,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Loader2,
  Calendar,
  Coins,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  X,
  CreditCard,
  IndianRupee,
  User,
  Printer,
  Trash2,
  AlertCircle,
} from "lucide-react";
import PaymentForm from "@/components/payments/PaymentForm";
import { useDashboardStore } from "@/lib/store/useDashboardStore";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { generateReceiptPdf } from "@/lib/pdf/generateReceipt";
import { Edit2 } from "lucide-react";

interface Payment {
  id: string;
  paymentNo: string;
  payeeName: string;
  mobileNumber: string | null;
  amount: string;
  paymentType: string;
  chequeNo: string | null;
  bankName: string | null;
  transactionId: string | null;
  date: string;
  notes: string | null;
  category: {
    id: string;
    name: string;
    head: {
      id: string;
      name: string;
    };
  };
  createdBy: {
    name: string;
  };
}

export default function PaymentsPage() {
  const queryClient = useQueryClient();
  const { currentTrust } = useDashboardStore();
  const { hasPermission } = usePermissions();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "date", desc: true },
  ]);
  const [globalFilter, setGlobalFilter] = useState("");

  // Fetch active trust settings (Address & Contact Phone)
  const { data: trustSettings } = useQuery({
    queryKey: ["trustSettings", currentTrust?.id],
    queryFn: async () => {
      const res = await fetch(`/api/settings?trustId=${currentTrust?.id}`);
      const json = await res.json();
      return json.success ? json.data : null;
    },
  });

  const handlePrint = React.useCallback((payment: Payment) => {
    generateReceiptPdf(
      {
        type: "PAYMENT",
        voucherNo: payment.paymentNo,
        date: payment.date,
        name: payment.payeeName,
        categoryName: `${payment.category.head.name} - ${payment.category.name}`,
        amount: parseFloat(payment.amount),
        paymentType: payment.paymentType,
        chequeNo: payment.chequeNo,
        bankName: payment.bankName,
        transactionId: payment.transactionId,
        notes: payment.notes,
      },
      trustSettings?.name || currentTrust.name,
      trustSettings?.address,
      trustSettings?.phone
    );
  }, [currentTrust, trustSettings]);

  // Fetch payments using TanStack Query
  const { data: payments = [], isLoading, refetch } = useQuery<Payment[]>({
    queryKey: ["payments", currentTrust?.id],
    queryFn: async () => {
      const res = await fetch(`/api/payments?trustId=${currentTrust?.id}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to load payments");
      return json.data;
    },
  });

  // Delete mutation
  const deletePaymentMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/payments/${id}?trustId=${currentTrust?.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to delete payment");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments", currentTrust?.id] });
      setActionError(null);
    },
    onError: (err: Error) => {
      setActionError(err.message);
    },
  });

  const handleDeletePayment = React.useCallback((payment: Payment) => {
    if (!confirm(`Are you sure you want to permanently delete Payment Voucher ${payment.paymentNo}? This action cannot be undone.`)) return;
    deletePaymentMutation.mutate(payment.id);
  }, [deletePaymentMutation]);

  // Table Columns Definition
  const columns = React.useMemo<ColumnDef<Payment>[]>(
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
        accessorKey: "paymentNo",
        header: "Voucher No",
        cell: (info) => (
          <span className="font-bold text-amber-600 dark:text-amber-400">
            {info.getValue() as string}
          </span>
        ),
      },
      {
        accessorKey: "payeeName",
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <span>Payee / Supplier</span>
            <ArrowUpDown className="h-3.5 w-3.5" />
          </button>
        ),
        cell: (info) => {
          const row = info.row.original;
          return (
            <div>
              <p className="font-bold text-slate-900 dark:text-white">{row.payeeName}</p>
              {row.mobileNumber && (
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                  Ph: {row.mobileNumber}
                </p>
              )}
            </div>
          );
        },
      },
      {
        id: "category",
        header: "Ledger Category",
        accessorFn: (row) => `${row.category.head.name} - ${row.category.name}`,
        cell: (info) => {
          const cat = info.row.original.category;
          return (
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
                {cat.head.name}
              </p>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                {cat.name}
              </p>
            </div>
          );
        },
      },
      {
        accessorKey: "amount",
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-white transition-colors ml-auto"
          >
            <span>Amount</span>
            <ArrowUpDown className="h-3.5 w-3.5" />
          </button>
        ),
        cell: (info) => {
          const val = parseFloat(info.getValue() as string);
          return (
            <div className="text-right font-bold text-rose-600 dark:text-rose-400 flex items-center justify-end gap-0.5">
              <IndianRupee className="h-3.5 w-3.5 stroke-[2.5px]" />
              <span>{val.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
          );
        },
      },
      {
        accessorKey: "paymentType",
        header: "Method",
        cell: (info) => {
          const val = info.getValue() as string;
          return (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold ${
                val === "CASH"
                  ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-350"
                  : val === "CHEQUE"
                  ? "bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400"
                  : "bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400"
              }`}
            >
              <CreditCard className="h-3 w-3" />
              {val}
            </span>
          );
        },
      },
      {
        id: "createdBy",
        accessorFn: (row) => row.createdBy.name,
        header: "Recorded By",
        cell: (info) => (
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="truncate max-w-[100px]">{info.getValue() as string}</span>
          </div>
        ),
      },
      {
        id: "actions",
        header: () => <div className="text-right">Actions</div>,
        cell: (info) => {
          const row = info.row.original;
          const canEdit = hasPermission("PAYMENT_UPDATE");
          const canDelete = hasPermission("PAYMENT_DELETE");
          return (
            <div className="flex items-center justify-end gap-1">
              <button
                onClick={() => handlePrint(row)}
                title="Print PDF Payment Voucher"
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 rounded-lg transition-colors"
              >
                <Printer className="h-4 w-4" />
              </button>
              {canEdit && (
                <button
                  onClick={() => setEditingPayment(row)}
                  title="Edit Payment"
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg transition-colors"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => handleDeletePayment(row)}
                  title="Delete Payment"
                  disabled={deletePaymentMutation.isPending}
                  className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-400 hover:text-red-500 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          );
        },
      },
    ],
    [handlePrint, handleDeletePayment, hasPermission, deletePaymentMutation.isPending, setEditingPayment]
  );

  // Initialize TanStack React Table
  const table = useReactTable({
    data: payments,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  const handleFormSuccess = () => {
    refetch();
    setIsModalOpen(false);
    setEditingPayment(null);
  };

  return (
    <div className="w-full min-w-0 space-y-6 text-xs font-semibold">
      {/* Action header bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-200">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500">
            <Coins className="h-5.5 w-5.5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Payment Vouchers</h2>
            <p className="text-xs text-slate-450 dark:text-slate-500 mt-0.5">
              Track outgoing expenses, vendor payments, and operational costs
            </p>
          </div>
        </div>

        {hasPermission("PAYMENT_CREATE") && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white px-4 py-2.5 text-xs font-bold shadow-md shadow-red-950/10 transition-all active:scale-[0.98]"
          >
            <Plus className="h-4.5 w-4.5" />
            <span>New Payment</span>
          </button>
        )}
      </div>

      {/* Action Error Alert */}
      {actionError && (
        <div className="flex items-center justify-between p-3 rounded-xl border border-red-200 bg-red-50 text-red-600">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4.5 w-4.5 shrink-0" />
            <span className="text-[11px] font-medium">{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="p-1 hover:bg-red-100 rounded-md">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main Table Content */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors duration-200">
        {/* Search filter bar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={globalFilter ?? ""}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Search by voucher number, payee name, or category..."
              className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 pl-10 pr-4 py-2 text-slate-800 dark:text-white outline-none focus:border-amber-500 transition-colors"
            />
          </div>
        </div>

        {/* Loading / Empty / Data Table view rendering */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
            <p className="text-xs text-slate-400 font-medium animate-pulse">
              Retrieving ledger records...
            </p>
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-20 text-slate-450 dark:text-slate-550">
            <p>No payment vouchers recorded yet.</p>
            {hasPermission("PAYMENT_CREATE") && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="mt-3 text-xs font-semibold text-amber-600 hover:text-amber-700"
              >
                Record First Payment
              </button>
            )}
          </div>
        ) : (
          <div className="max-w-full overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr
                    key={headerGroup.id}
                    className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-500"
                  >
                    {headerGroup.headers.map((header) => (
                      <th key={header.id} className="px-3 py-2.5 font-bold">
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm font-medium">
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-50/30 dark:hover:bg-slate-800/20 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-3 py-2 text-slate-700 dark:text-slate-300">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Pagination Section */}
        {payments.length > 0 && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 flex-wrap">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount() || 1} — Showing {table.getRowModel().rows.length} of{" "}
              {payments.length} entries
            </span>

            <div className="flex items-center gap-1">
              <button
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="p-1.5 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-655 dark:text-slate-400 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="h-4.5 w-4.5" />
              </button>
              <button
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="p-1.5 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-655 dark:text-slate-400 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── NEW PAYMENT MODAL ──────────────────────────────────────── */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto custom-scrollbar">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-black/55 backdrop-blur-sm"
            />
            {/* Form panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              className="relative w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 md:p-8 shadow-2xl z-10 my-8"
            >
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-250 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-4.5 w-4.5" />
              </button>

              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                Record New Payment
              </h3>
              <p className="text-xs text-slate-450 dark:text-slate-550 mb-6">
                Fill details to disburse funds and record a payment voucher entry.
              </p>

              <PaymentForm onSuccess={handleFormSuccess} onCancel={() => setIsModalOpen(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── EDIT PAYMENT MODAL ─────────────────────────────────────── */}
      <AnimatePresence>
        {editingPayment && (
          <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto custom-scrollbar">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingPayment(null)}
              className="fixed inset-0 bg-black/55 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              className="relative w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 md:p-8 shadow-2xl z-10 my-8"
            >
              <button
                onClick={() => setEditingPayment(null)}
                className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-250 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-4.5 w-4.5" />
              </button>

              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                Edit Payment — {editingPayment.paymentNo}
              </h3>
              <p className="text-xs text-slate-450 dark:text-slate-550 mb-6">
                Update the details of this payment voucher. The voucher number will remain unchanged.
              </p>

              <PaymentForm
                onSuccess={handleFormSuccess}
                onCancel={() => setEditingPayment(null)}
                initialData={editingPayment}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
