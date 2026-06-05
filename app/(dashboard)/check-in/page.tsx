"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  Calendar,
  AlertCircle,
  UserCheck,
  LogOut,
  Search,
  Bed,
  Phone,
  Activity,
  CheckCircle2,
} from "lucide-react";
import { useDashboardStore } from "@/lib/store/useDashboardStore";

interface Room {
  id: string;
  roomNumber: string;
  name: string;
  type: string;
  floor: string | null;
}

interface Booking {
  id: string;
  bookingNo: string;
  roomId: string;
  room: Room;
  guestName: string;
  mobileNumber: string;
  email: string | null;
  address: string | null;
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

export default function CheckInOutDeskPage() {
  const queryClient = useQueryClient();
  const { currentTrust } = useDashboardStore();
  const [activeTab, setActiveTab] = useState<"arrivals" | "guests">("arrivals");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Fetch bookings list scoped to selected trust
  const { data: bookings = [], isLoading } = useQuery<Booking[]>({
    queryKey: ["bookings", currentTrust?.id],
    queryFn: async () => {
      if (!currentTrust?.id) return [];
      const res = await fetch(`/api/bookings?trustId=${currentTrust?.id}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to load bookings");
      return json.data;
    },
    enabled: !!currentTrust?.id,
  });

  // Status transition mutation (Check-in or Check-out)
  const transitionMutation = useMutation({
    mutationFn: async ({
      id,
      bookingStatus,
      paymentStatus,
    }: {
      id: string;
      bookingStatus: string;
      paymentStatus?: string;
    }) => {
      const res = await fetch(`/api/bookings/${id}?trustId=${currentTrust?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingStatus, paymentStatus }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to update guest status");
      return json.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant query keys
      queryClient.invalidateQueries({ queryKey: ["bookings", currentTrust?.id] });
      queryClient.invalidateQueries({ queryKey: ["rooms", currentTrust?.id] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats", currentTrust?.id] });
      
      setActionError(null);
      if (variables.bookingStatus === "CHECKED_IN") {
        setActionSuccess(`Successfully checked in ${data.guestName}! Room ${data.room.roomNumber} is now occupied.`);
      } else if (variables.bookingStatus === "CHECKED_OUT") {
        setActionSuccess(`Successfully checked out ${data.guestName} and settled any outstanding dues.`);
      }
      
      // Auto-clear success message after 5 seconds
      setTimeout(() => {
        setActionSuccess(null);
      }, 5000);
    },
    onError: (err) => {
      setActionSuccess(null);
      setActionError(err.message);
    },
  });

  const handleCheckIn = (bookingId: string) => {
    setActionError(null);
    setActionSuccess(null);
    transitionMutation.mutate({ id: bookingId, bookingStatus: "CHECKED_IN" });
  };

  const handleCheckOut = (bookingId: string) => {
    setActionError(null);
    setActionSuccess(null);
    // Checkout settles any remaining balance automatically
    transitionMutation.mutate({
      id: bookingId,
      bookingStatus: "CHECKED_OUT",
      paymentStatus: "PAID",
    });
  };

  // Filter bookings based on tab and search query
  const filteredBookings = bookings.filter((booking) => {
    const matchesTab =
      activeTab === "arrivals"
        ? booking.bookingStatus === "CONFIRMED"
        : booking.bookingStatus === "CHECKED_IN";

    const matchesSearch =
      booking.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.bookingNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.room.roomNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (booking.mobileNumber && booking.mobileNumber.includes(searchQuery));

    return matchesTab && matchesSearch;
  });

  const formattedDate = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="w-full min-w-0 space-y-6 text-xs font-semibold">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-200">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
            <Activity className="h-5.5 w-5.5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Front Desk Kiosk</h2>
            <p className="text-xs text-slate-450 dark:text-slate-550 mt-0.5">
              Live guest registration dashboard for checking-in pending arrivals and checking-out active Yatris.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 border border-amber-500/20 shadow-sm shrink-0 self-start sm:self-center">
          <Calendar className="w-4 h-4" />
          <span>Today: {formattedDate}</span>
        </div>
      </div>

      {/* Success / Error Alerts */}
      <AnimatePresence>
        {actionSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2.5 p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-400"
          >
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
            <span className="text-xs font-semibold">{actionSuccess}</span>
          </motion.div>
        )}

        {actionError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2.5 p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400"
          >
            <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
            <span className="text-xs font-semibold">{actionError}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs and Search Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Tab Selectors */}
        <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800 self-start">
          <button
            onClick={() => {
              setActiveTab("arrivals");
              setSearchQuery("");
            }}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all duration-200 ${
              activeTab === "arrivals"
                ? "bg-white text-slate-800 shadow-sm dark:bg-slate-900 dark:text-white"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Today&apos;s Arrivals (Pending Check-Ins)</span>
            {bookings.filter((b) => b.bookingStatus === "CONFIRMED").length > 0 && (
              <span className="ml-1 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
                {bookings.filter((b) => b.bookingStatus === "CONFIRMED").length}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              setActiveTab("guests");
              setSearchQuery("");
            }}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all duration-200 ${
              activeTab === "guests"
                ? "bg-white text-slate-800 shadow-sm dark:bg-slate-900 dark:text-white"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <LogOut className="w-4 h-4" />
            <span>Current Guests (Pending Check-Outs)</span>
            {bookings.filter((b) => b.bookingStatus === "CHECKED_IN").length > 0 && (
              <span className="ml-1 rounded-full bg-blue-500 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
                {bookings.filter((b) => b.bookingStatus === "CHECKED_IN").length}
              </span>
            )}
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, room, phone..."
            className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 pl-10 pr-4 py-2 text-slate-850 dark:text-white outline-none focus:border-amber-500 dark:focus:border-amber-500 transition-colors shadow-sm"
          />
        </div>
      </div>

      {/* Main Table Content */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors duration-200">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
            <p className="text-xs text-slate-400 font-medium animate-pulse">
              Retrieving Sarai booking logs...
            </p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="text-center py-20 text-slate-400 dark:text-slate-500">
            <p className="text-sm font-bold">No reservations found</p>
            <p className="text-xs text-slate-450 dark:text-slate-600 mt-1 font-medium">
              {searchQuery ? "No results match your search query." : activeTab === "arrivals" ? "There are no pending guest arrivals today." : "There are no active checked-in guests in the Sarai."}
            </p>
          </div>
        ) : (
          <div className="max-w-full overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-500">
                  <th className="px-6 py-4">Booking Info</th>
                  <th className="px-6 py-4">Guest Details</th>
                  <th className="px-6 py-4">Room & Type</th>
                  <th className="px-6 py-4">Schedule</th>
                  <th className="px-6 py-4">Financial Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-medium">
                {filteredBookings.map((booking) => {
                  const checkInFormatted = format(new Date(booking.checkIn), "dd MMM yyyy");
                  const checkOutFormatted = format(new Date(booking.checkOut), "dd MMM yyyy");
                  const due = parseFloat(booking.balanceDue);
                  const isFullyPaid = due <= 0;

                  return (
                    <tr
                      key={booking.id}
                      className="hover:bg-slate-50/30 dark:hover:bg-slate-800/20 transition-colors"
                    >
                      {/* Booking ID Info */}
                      <td className="px-6 py-4">
                        <span className="font-bold text-amber-600 dark:text-amber-400 block">
                          {booking.bookingNo}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                          {booking.totalNights} Night{booking.totalNights > 1 ? "s" : ""} stay
                        </span>
                      </td>

                      {/* Guest Details */}
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900 dark:text-white">{booking.guestName}</p>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-medium">
                          <Phone className="h-3 w-3" />
                          <span>{booking.mobileNumber}</span>
                        </div>
                      </td>

                      {/* Room & Floor */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0">
                            <Bed className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              Room {booking.room.roomNumber}
                            </span>
                            <span className="text-[10px] text-slate-400 block font-medium mt-0.5">
                              {booking.room.name} • {booking.room.type}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Schedule Dates */}
                      <td className="px-6 py-4">
                        <div className="space-y-0.5">
                          <div className="text-slate-600 dark:text-slate-350">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mr-1.5">In:</span>
                            <span>{checkInFormatted}</span>
                          </div>
                          <div className="text-slate-600 dark:text-slate-350">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mr-1">Out:</span>
                            <span>{checkOutFormatted}</span>
                          </div>
                        </div>
                      </td>

                      {/* Payment Status Badging & Dues */}
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold ${
                                isFullyPaid
                                  ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
                                  : booking.paymentStatus === "PARTIAL"
                                  ? "bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400"
                                  : "bg-rose-500/10 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400"
                              }`}
                            >
                              {isFullyPaid ? "Fully Paid" : booking.paymentStatus === "PARTIAL" ? "Partial" : "Pending"}
                            </span>
                          </div>
                          <div className="flex items-center gap-0.5 text-[10px] font-bold text-slate-500 mt-1">
                            <span>Total: ₹{parseFloat(booking.totalAmount).toLocaleString("en-IN")}</span>
                          </div>
                          {!isFullyPaid && (
                            <div className="flex items-center gap-0.5 text-[10px] font-bold text-rose-500 dark:text-rose-400">
                              <span>Due: ₹{due.toLocaleString("en-IN")}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Inline Actions */}
                      <td className="px-6 py-4 text-right">
                        {activeTab === "arrivals" ? (
                          <button
                            onClick={() => handleCheckIn(booking.id)}
                            disabled={transitionMutation.isPending}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white px-3 py-2 text-xs font-bold shadow-md shadow-orange-950/10 hover:shadow-orange-950/20 transition-all disabled:opacity-50 active:scale-[0.98]"
                          >
                            {transitionMutation.isPending && transitionMutation.variables?.id === booking.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <UserCheck className="h-3.5 w-3.5" />
                            )}
                            <span>Check In Guest</span>
                          </button>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            {due > 0 && (
                              <div className="text-[10px] text-right font-medium text-amber-655 mr-1 hidden sm:block">
                                Unsettled Balance:<br/>
                                <span className="font-bold text-rose-500 dark:text-rose-400 text-xs">₹{due.toLocaleString("en-IN")}</span>
                              </div>
                            )}
                            <button
                              onClick={() => handleCheckOut(booking.id)}
                              disabled={transitionMutation.isPending}
                              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all shadow-md active:scale-[0.98] ${
                                isFullyPaid
                                  ? "bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-700 dark:hover:bg-slate-655 shadow-slate-950/10"
                                  : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-950/10"
                              }`}
                            >
                              {transitionMutation.isPending && transitionMutation.variables?.id === booking.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <LogOut className="h-3.5 w-3.5" />
                              )}
                              <span>{isFullyPaid ? "Check Out" : "Settle & Checkout"}</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Front Desk Info Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition-colors duration-200">
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Checking-In Guidelines</h4>
          <p className="text-[10px] text-slate-450 dark:text-slate-500 font-medium leading-relaxed mt-2">
            1. Verify the guest&apos;s Identity Proof (Aadhaar/Passport) matches the registered booking name.<br/>
            2. Collect any remaining advance deposit if required before checking the guest in.<br/>
            3. Provide room keys and direct guests to their assigned rooms.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition-colors duration-200">
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Checking-Out Guidelines</h4>
          <p className="text-[10px] text-slate-450 dark:text-slate-500 font-medium leading-relaxed mt-2">
            1. Settle all pending balance payments (the system marks the booking as fully PAID on Checkout).<br/>
            2. Inspect rooms for any property damage or missing items.<br/>
            3. Retrieve room keys and mark the room as vacant and ready for cleaning.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition-colors duration-200">
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">System Information</h4>
          <p className="text-[10px] text-slate-450 dark:text-slate-500 font-medium leading-relaxed mt-2">
            Rooms will automatically transition status: vacant rooms show as AVAILABLE, while checked-in rooms become OCCUPIED. 
            Checking out a guest returns the room to available status.
          </p>
        </div>
      </div>
    </div>
  );
}
