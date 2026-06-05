"use client";

import React, { useState, useCallback } from "react";
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
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  X,
  UserCheck,
  LogOut,
  AlertCircle,
  List,
  CalendarDays,
} from "lucide-react";
import BookingForm from "@/components/bookings/BookingForm";
import BookingCalendar from "@/components/bookings/BookingCalendar";
import { useDashboardStore } from "@/lib/store/useDashboardStore";
import { usePermissions } from "@/lib/hooks/usePermissions";

interface Booking {
  id: string;
  bookingNo: string;
  roomId: string;
  room: {
    id: string;
    roomNumber: string;
    name: string;
    type: string;
  };
  guestName: string;
  mobileNumber: string;
  email: string | null;
  address: string | null;
  idProofType: string | null;
  idProofNo: string | null;
  checkIn: string;
  checkOut: string;
  totalNights: number;
  totalAmount: string;
  advancePaid: string;
  balanceDue: string;
  paymentStatus: "PENDING" | "PARTIAL" | "PAID";
  bookingStatus: "CONFIRMED" | "CHECKED_IN" | "CHECKED_OUT" | "CANCELLED" | "NO_SHOW";
  notes: string | null;
}

export default function BookingsPage() {
  const queryClient = useQueryClient();
  const { currentTrust } = useDashboardStore();
  const { hasPermission } = usePermissions();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [sorting, setSorting] = useState<SortingState>([
    { id: "checkIn", desc: true },
  ]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  // Fetch bookings list
  const { data: bookings = [], isLoading, refetch } = useQuery<Booking[]>({
    queryKey: ["bookings", currentTrust?.id],
    queryFn: async () => {
      const res = await fetch(`/api/bookings?trustId=${currentTrust?.id}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to load bookings");
      return json.data;
    },
  });

  // Booking status transition mutation
  const transitionMutation = useMutation({
    mutationFn: async ({
      id,
      bookingStatus,
      paymentStatus,
    }: {
      id: string;
      bookingStatus?: string;
      paymentStatus?: string;
    }) => {
      const res = await fetch(`/api/bookings/${id}?trustId=${currentTrust?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingStatus, paymentStatus }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to update status");
      return json.data;
    },
    onSuccess: () => {
      // Invalidate both lists to trigger UI refreshes
      queryClient.invalidateQueries({ queryKey: ["bookings", currentTrust?.id] });
      queryClient.invalidateQueries({ queryKey: ["rooms", currentTrust?.id] });
      setActionError(null);
    },
    onError: (err) => {
      setActionError(err.message);
    },
  });

  const handleCheckIn = useCallback((bookingId: string) => {
    transitionMutation.mutate({ id: bookingId, bookingStatus: "CHECKED_IN" });
  }, [transitionMutation]);

  const handleCheckOut = useCallback((bookingId: string) => {
    // Automatically settle payment as PAID on checkout
    transitionMutation.mutate({
      id: bookingId,
      bookingStatus: "CHECKED_OUT",
      paymentStatus: "PAID",
    });
  }, [transitionMutation]);

  const handleCancelBooking = useCallback((bookingId: string) => {
    if (confirm("Are you sure you want to cancel this reservation?")) {
      transitionMutation.mutate({ id: bookingId, bookingStatus: "CANCELLED" });
    }
  }, [transitionMutation]);

  const handleSettlePayment = useCallback((bookingId: string) => {
    transitionMutation.mutate({ id: bookingId, paymentStatus: "PAID" });
  }, [transitionMutation]);

  // Columns Definitions
  const columns = React.useMemo<ColumnDef<Booking>[]>(
    () => [
      {
        accessorKey: "bookingNo",
        header: "Booking No",
        cell: (info) => (
          <span className="font-bold text-amber-600 dark:text-amber-400">
            {info.getValue() as string}
          </span>
        ),
      },
      {
        accessorKey: "guestName",
        header: "Lead Yatri",
        cell: (info) => {
          const row = info.row.original;
          return (
            <div>
              <p className="font-bold text-slate-900 dark:text-white">{row.guestName}</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-550 mt-0.5">
                Ph: {row.mobileNumber}
              </p>
            </div>
          );
        },
      },
      {
        id: "roomNo",
        header: "Room Assigned",
        accessorFn: (row) => row.room.roomNumber,
        cell: (info) => {
          const room = info.row.original.room;
          return (
            <div>
              <span className="font-bold text-slate-700 dark:text-slate-300">
                Room {room.roomNumber}
              </span>
              <p className="text-[10px] text-slate-400 dark:text-slate-550 mt-0.5">
                {room.name}
              </p>
            </div>
          );
        },
      },
      {
        accessorKey: "checkIn",
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <span>Lodging Schedule</span>
            <ArrowUpDown className="h-3.5 w-3.5" />
          </button>
        ),
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="space-y-0.5 text-slate-600 dark:text-slate-400">
              <p className="flex items-center gap-1">
                <span className="text-[9px] uppercase font-bold text-slate-400">In:</span>
                <span>{format(new Date(row.checkIn), "dd MMM yyyy")}</span>
              </p>
              <p className="flex items-center gap-1">
                <span className="text-[9px] uppercase font-bold text-slate-400">Out:</span>
                <span>{format(new Date(row.checkOut), "dd MMM yyyy")}</span>
              </p>
            </div>
          );
        },
      },
      {
        accessorKey: "totalNights",
        header: "Nights",
        cell: (info) => (
          <span>
            {info.getValue() as number} {info.getValue() as number === 1 ? "night" : "nights"}
          </span>
        ),
      },
      {
        id: "billing",
        header: "Seva / Balance",
        cell: (info) => {
          const row = info.row.original;
          const total = parseFloat(row.totalAmount);
          const balance = parseFloat(row.balanceDue);
          return (
            <div>
              <p className="font-semibold text-slate-700 dark:text-slate-355">
                Total: ₹{total.toFixed(0)}
              </p>
              {balance > 0 ? (
                <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                  Due: ₹{balance.toFixed(0)}
                </p>
              ) : (
                <p className="text-[9px] text-emerald-500 font-bold mt-0.5">Fully Settled</p>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "paymentStatus",
        header: "Payment",
        cell: (info) => {
          const val = info.getValue() as string;
          const canUpdate = hasPermission("BOOKING_UPDATE");
          return (
            <span
              onClick={() => {
                if (val !== "PAID" && canUpdate) handleSettlePayment(info.row.original.id);
              }}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[9px] font-bold ${
                val === "PAID"
                  ? "bg-emerald-555/15 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-450 cursor-default"
                  : canUpdate
                  ? "bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400 cursor-pointer hover:scale-105"
                  : "bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400 cursor-default"
              }`}
              title={val !== "PAID" && canUpdate ? "Click to Settle Payment" : ""}
            >
              {val}
            </span>
          );
        },
      },
      {
        accessorKey: "bookingStatus",
        header: "Reservation Status",
        cell: (info) => {
          const val = info.getValue() as string;
          return (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[9px] font-bold ${
                val === "CHECKED_IN"
                  ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400 animate-pulse-slow"
                  : val === "CONFIRMED"
                  ? "bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400"
                  : val === "CHECKED_OUT"
                  ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                  : "bg-red-500/10 text-red-600 dark:bg-red-500/15 dark:text-red-400"
              }`}
            >
              {val === "CHECKED_IN"
                ? "Checked In"
                : val === "CONFIRMED"
                ? "Confirmed"
                : val === "CHECKED_OUT"
                ? "Checked Out"
                : "Cancelled"}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "Lodging Actions",
        cell: (info) => {
          const booking = info.row.original;
          const status = booking.bookingStatus;
          const canUpdate = hasPermission("BOOKING_UPDATE");

          if (!canUpdate) {
            return <span className="text-[10px] text-slate-400 italic font-semibold">No permission</span>;
          }

          return (
            <div className="flex items-center gap-1.5">
              {status === "CONFIRMED" && (
                <>
                  <button
                    onClick={() => handleCheckIn(booking.id)}
                    className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors text-[10px] font-bold"
                  >
                    <UserCheck className="h-3 w-3" />
                    <span>Check In</span>
                  </button>
                  <button
                    onClick={() => handleCancelBooking(booking.id)}
                    className="px-2 py-1 border border-slate-200 dark:border-slate-800 hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-450 hover:text-red-500 rounded-lg transition-colors text-[10px]"
                  >
                    Cancel
                  </button>
                </>
              )}

              {status === "CHECKED_IN" && (
                <button
                  onClick={() => handleCheckOut(booking.id)}
                  className="flex items-center gap-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors text-[10px] font-bold"
                >
                  <LogOut className="h-3 w-3" />
                  <span>Check Out</span>
                </button>
              )}

              {["CHECKED_OUT", "CANCELLED"].includes(status) && (
                <span className="text-[10px] text-slate-400 font-semibold italic">Archived</span>
              )}
            </div>
          );
        },
      },
    ],
    [handleCancelBooking, handleCheckIn, handleCheckOut, handleSettlePayment, hasPermission]
  );

  // Table Configuration
  const table = useReactTable({
    data: bookings,
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
  };

  return (
    <div className="w-full min-w-0 h-full flex flex-col gap-6 text-xs font-semibold overflow-hidden">
      {/* Action header bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-200">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
            <CalendarRange className="h-5.5 w-5.5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Booking Desk</h2>
            <p className="text-xs text-slate-450 dark:text-slate-550 mt-0.5">
              Manage guest check-ins, lodging reservations, check-outs, and voucher bill settlements
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/50 rounded-xl p-1 border border-slate-200 dark:border-slate-800/50">
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                viewMode === "list"
                  ? "bg-amber-500 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800"
              }`}
            >
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">List</span>
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                viewMode === "calendar"
                  ? "bg-amber-500 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800"
              }`}
            >
              <CalendarDays className="h-4 w-4" />
              <span className="hidden sm:inline">Calendar</span>
            </button>
          </div>

          {hasPermission("BOOKING_CREATE") && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white px-4 py-2.5 text-xs font-bold shadow-md shadow-orange-950/10 transition-all active:scale-[0.98]"
            >
              <Plus className="h-4.5 w-4.5" />
              <span>New Booking</span>
            </button>
          )}
        </div>
      </div>

      {/* Action alert toast error */}
      {actionError && (
        <div className="flex items-center justify-between p-3 rounded-xl border border-red-200 bg-red-50 text-red-655 transition-all">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4.5 w-4.5 shrink-0" />
            <span className="text-[11px] font-medium">{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="p-1 hover:bg-red-100 rounded-md">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Conditional View Render */}
      {viewMode === "list" ? (
        <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col transition-colors duration-200">
          {/* Search filter bar */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center shrink-0">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={globalFilter ?? ""}
                onChange={(e) => setGlobalFilter(e.target.value)}
                placeholder="Search bookings by guest name, booking number, or room..."
                className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 pl-10 pr-4 py-2 text-slate-800 dark:text-white outline-none focus:border-amber-500 transition-colors"
              />
            </div>
          </div>

          {/* View render state */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
                <p className="text-xs text-slate-400 font-medium animate-pulse">
                  Retrieving bookings list...
                </p>
              </div>
            ) : bookings.length === 0 ? (
              <div className="text-center py-20 text-slate-450 dark:text-slate-550">
                <p>No reservations recorded yet.</p>
                {hasPermission("BOOKING_CREATE") && (
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="mt-3 text-xs font-semibold text-amber-600 hover:text-amber-700"
                  >
                    Book First Room
                  </button>
                )}
              </div>
            ) : (
              <div className="max-w-full overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead className="sticky top-0 z-10 bg-white dark:bg-slate-900">
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
          </div>

          {/* Pagination control */}
          {bookings.length > 0 && (
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 shrink-0 flex-wrap">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Page {table.getState().pagination.pageIndex + 1} of{" "}
                {table.getPageCount() || 1} — Showing {table.getRowModel().rows.length} of{" "}
                {bookings.length} entries
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
      ) : (
        <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col transition-colors duration-200">
          <BookingCalendar bookings={bookings} isLoading={isLoading} />
        </div>
      )}

      {/* ─── NEW RESERVATION MODAL ─────────────────────────────────── */}
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
            {/* Form card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              className="relative w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 md:p-8 shadow-2xl z-10 my-8"
            >
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-650 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-4.5 w-4.5" />
              </button>

              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                Record New Reservation
              </h3>
              <p className="text-xs text-slate-450 dark:text-slate-550 mb-6">
                Register a guest booking, specify lodging rates, and enter advance payment details.
              </p>

              <BookingForm onSuccess={handleFormSuccess} onCancel={() => setIsModalOpen(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
