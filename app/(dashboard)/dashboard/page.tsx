"use client";

import React from "react";
import { motion } from "framer-motion";
import { useDashboardStore } from "@/lib/store/useDashboardStore";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  Users,
  Bed,
  ArrowUpRight,
  PlusCircle,
  FileText,
  UserPlus,
  KeyRound,
  Calendar,
  IndianRupee,
  Clock,
  ArrowRight,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface RecentBooking {
  id: string;
  guestName: string;
  checkIn: string;
  bookingStatus: string;
  totalAmount: string;
  room: {
    roomNumber: string;
    name: string;
  };
}

interface DashboardStats {
  totalReceipts: number;
  occupancyRate: number;
  occupiedRoomsCount: number;
  totalRooms: number;
  activeGuestsCount: number;
  todayCheckIns: number;
  pendingDues: number;
  awaitingCheckoutCount: number;
  recentBookings: RecentBooking[];
}

export default function DashboardPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { currentTrust, currentUser } = useDashboardStore();

  // Fetch real statistics from API
  const { data: statsData, isLoading, isError, error } = useQuery<DashboardStats>({
    queryKey: ["dashboardStats", currentTrust.id],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/stats?trustId=${currentTrust.id}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to load dashboard statistics");
      return json.data;
    },
  });

  const displayName = session?.user?.name || currentUser.name;

  // Construct actual stats cards
  const stats = [
    {
      label: "Total Receipts (This Month)",
      value: isLoading ? "..." : `₹ ${statsData?.totalReceipts.toLocaleString("en-IN")}`,
      change: "Collections for current month",
      isPositive: true,
      icon: IndianRupee,
      color: "from-amber-500 to-orange-500",
    },
    {
      label: "Room Occupancy",
      value: isLoading ? "..." : `${statsData?.occupancyRate}%`,
      change: isLoading
        ? "..."
        : `${statsData?.occupiedRoomsCount} of ${statsData?.totalRooms} Rooms Booked`,
      isPositive: true,
      icon: Bed,
      color: "from-blue-500 to-indigo-600",
    },
    {
      label: "Active Yatris",
      value: isLoading ? "..." : `${statsData?.activeGuestsCount}`,
      change: isLoading ? "..." : `+${statsData?.todayCheckIns} check-ins today`,
      isPositive: true,
      icon: Users,
      color: "from-emerald-500 to-teal-600",
    },
    {
      label: "Pending Dues",
      value: isLoading ? "..." : `₹ ${statsData?.pendingDues.toLocaleString("en-IN")}`,
      change: isLoading ? "..." : `${statsData?.awaitingCheckoutCount} bookings awaiting checkout`,
      isPositive: false,
      icon: Clock,
      color: "from-rose-500 to-red-600",
    },
  ];

  const bookings = statsData?.recentBookings || [];

  // Framer Motion container animations
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100 } },
  };

  if (isError) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-red-50 border border-red-200 rounded-2xl text-red-755 text-center font-semibold text-xs">
        <AlertCircle className="h-10 w-10 mx-auto mb-3 text-red-500" />
        <h3 className="text-sm font-bold">Failed to load statistics</h3>
        <p className="text-[11px] mt-1 text-red-605 font-medium">{(error as Error).message}</p>
      </div>
    );
  }

  // Get current date representation
  const formattedDate = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    weekday: "long",
  });

  return (
    <div className="w-full min-w-0 space-y-8 text-xs font-semibold">
      {/* Welcome & Context Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white md:text-3xl">
            Waheguru Ji Ka Khalsa, Waheguru Ji Ki Fateh
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Welcome back, <span className="font-semibold text-slate-700 dark:text-slate-350">{displayName}</span>. 
            Here is the current status of <span className="font-semibold text-amber-600 dark:text-amber-400">{currentTrust.name}</span>.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 border border-amber-500/20 shadow-sm shrink-0">
          <Calendar className="w-4 h-4" />
          <span>{formattedDate}</span>
        </div>
      </div>

      {/* Stats Cards Section */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              variants={itemVariants}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-colors duration-200"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {stat.label}
                </span>
                <div className={`rounded-xl bg-gradient-to-tr ${stat.color} p-2 text-white shadow-md shadow-slate-200 dark:shadow-none`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {stat.value}
                </span>
              </div>
              <p className="mt-1.5 flex items-center gap-1.5 text-xs">
                <TrendingUp className={`h-3.5 w-3.5 ${stat.isPositive ? "text-emerald-500" : "text-slate-400"}`} />
                <span className={stat.isPositive ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-slate-500"}>
                  {stat.change}
                </span>
              </p>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Action Console & Table Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* Recent Bookings & Room Status (2 columns on large screens) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden transition-colors duration-200">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Recent Bookings & Check-ins
                </h3>
                <p className="text-xs text-slate-450 dark:text-slate-500 mt-0.5">
                  Latest activity logs for Sarai & Yatri lodging
                </p>
              </div>
              <button
                onClick={() => router.push("/bookings")}
                className="flex items-center gap-1 text-xs font-semibold text-amber-500 hover:text-amber-600 dark:hover:text-amber-450 transition-colors"
              >
                <span>View Desk</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
            
            <div className="max-w-full overflow-x-auto">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <Loader2 className="h-6 w-6 text-amber-500 animate-spin" />
                  <p className="text-[10px] text-slate-400 animate-pulse font-medium">Syncing live records...</p>
                </div>
              ) : bookings.length === 0 ? (
                <div className="text-center py-12 text-slate-400 dark:text-slate-500">
                  No recent bookings found.
                </div>
              ) : (
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50 text-xs font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-500">
                      <th className="px-6 py-3.5">Yatri Name</th>
                      <th className="px-6 py-3.5">Room Assigned</th>
                      <th className="px-6 py-3.5">Check In</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5 text-right">Seva Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs dark:divide-slate-800">
                    {bookings.map((booking) => (
                      <tr key={booking.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/20 transition-colors">
                        <td className="whitespace-nowrap px-6 py-4 font-semibold text-slate-850 dark:text-slate-300">
                          {booking.guestName}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-slate-500 dark:text-slate-400">
                          Room {booking.room.roomNumber} ({booking.room.name})
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-slate-550 dark:text-slate-400">
                          {new Date(booking.checkIn).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              booking.bookingStatus === "CHECKED_IN"
                                ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
                                : booking.bookingStatus === "CONFIRMED"
                                ? "bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400"
                                : "bg-slate-205/50 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                            }`}
                          >
                            {booking.bookingStatus === "CHECKED_IN"
                              ? "Checked In"
                              : booking.bookingStatus === "CONFIRMED"
                              ? "Reserved"
                              : booking.bookingStatus === "CHECKED_OUT"
                              ? "Checked Out"
                              : booking.bookingStatus === "CANCELLED"
                              ? "Cancelled"
                              : "No Show"}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right font-bold text-slate-800 dark:text-slate-200">
                          ₹ {Number(booking.totalAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions Console (1 column) */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-colors duration-200">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Quick Operations
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              One-click access to administrative desks
            </p>

            <div className="mt-4 grid gap-2.5">
              <button
                onClick={() => router.push("/receipts")}
                className="flex w-full items-center justify-between rounded-xl border border-slate-100 hover:border-amber-500/20 bg-slate-50/50 p-3 text-left hover:bg-gradient-to-r hover:from-amber-500/5 hover:to-orange-500/5 dark:border-slate-800/80 dark:bg-slate-900/40 dark:hover:bg-slate-850 transition-all duration-200 group"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-amber-500/10 p-2 text-amber-500 dark:bg-amber-500/15">
                    <PlusCircle className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Record New Seva Receipt</h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Collect donations / room seva contributions</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-350 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </button>

              <button
                onClick={() => router.push("/bookings")}
                className="flex w-full items-center justify-between rounded-xl border border-slate-100 hover:border-amber-500/20 bg-slate-50/50 p-3 text-left hover:bg-gradient-to-r hover:from-amber-500/5 hover:to-orange-500/5 dark:border-slate-800/80 dark:bg-slate-900/40 dark:hover:bg-slate-850 transition-all duration-200 group"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-blue-500/10 p-2 text-blue-500 dark:bg-blue-500/15">
                    <UserPlus className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">New Room Check-In</h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Assign room and register arriving Yatri</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-350 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </button>

              <button
                onClick={() => router.push("/bookings")}
                className="flex w-full items-center justify-between rounded-xl border border-slate-100 hover:border-amber-500/20 bg-slate-50/50 p-3 text-left hover:bg-gradient-to-r hover:from-amber-500/5 hover:to-orange-500/5 dark:border-slate-800/80 dark:bg-slate-900/40 dark:hover:bg-slate-850 transition-all duration-200 group"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-500 dark:bg-emerald-500/15">
                    <KeyRound className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Yatri Checkout</h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Settle balances and vacate lodging rooms</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-350 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </button>

              <button
                onClick={() => router.push("/payments")}
                className="flex w-full items-center justify-between rounded-xl border border-slate-100 hover:border-amber-500/20 bg-slate-50/50 p-3 text-left hover:bg-gradient-to-r hover:from-amber-500/5 hover:to-orange-500/5 dark:border-slate-800/80 dark:bg-slate-900/40 dark:hover:bg-slate-850 transition-all duration-200 group"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-purple-500/10 p-2 text-purple-500 dark:bg-purple-500/15">
                    <FileText className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Add Payment Ledger</h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Log expenses and bill payments</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-350 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
