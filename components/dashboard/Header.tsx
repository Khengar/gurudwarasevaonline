"use client";

import React, { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { useDashboardStore } from "@/lib/store/useDashboardStore";
import { useSession, signOut } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Menu,
  ChevronRight,
  ChevronDown,
  Building,
  User,
  LogOut,
  Bell,
  Shield,
  HelpCircle,
  Activity,
  Check,
  Banknote,
  CreditCard,
  X,
} from "lucide-react";
import { usePermissions } from "@/lib/hooks/usePermissions";
import ReceiptForm from "@/components/receipts/ReceiptForm";
import PaymentForm from "@/components/payments/PaymentForm";

// Route name mapping for breadcrumbs
const routeNameMap: Record<string, string> = {
  dashboard: "Dashboard",
  receipts: "Receipts",
  payments: "Payments",
  categories: "Category Heads",
  rooms: "Room Management",
  bookings: "Booking Desk",
  "check-in": "Check-In / Out Desk",
  "check-in-out": "Check-In / Out Desk",
  settings: "Trust Settings",
  users: "User Management",
};

interface HeaderProps {
  className?: string;
}

export default function Header({ className }: HeaderProps = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    toggleSidebar,
    toggleMobileSidebar,
    currentTrust,
    trusts,
    setCurrentTrust,
    setTrusts,
    currentUser,
  } = useDashboardStore();

  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();

  const displayName = session?.user?.name || currentUser.name;
  const displayEmail = session?.user?.email || currentUser.email;
  const displayRole = session?.user?.role || currentUser.role;

  // Query trusts dynamically
  const { data: trustsData } = useQuery({
    queryKey: ["trusts"],
    queryFn: async () => {
      const res = await fetch("/api/trusts");
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to load trusts");
      return json.data;
    },
    enabled: !!session,
  });

  // Sync loaded trusts into Zustand store
  useEffect(() => {
    interface TrustRecord { id: string; name: string; city?: string; state?: string; address?: string; }
    if (trustsData && trustsData.length > 0) {
      const mappedTrusts = (trustsData as TrustRecord[]).map((t) => ({
        id: t.id,
        name: t.name,
        location: t.city || t.state || t.address || "",
      }));
      setTrusts(mappedTrusts);

      const storeCurrentTrust = useDashboardStore.getState().currentTrust;
      const trustExists = mappedTrusts.some((t) => t.id === storeCurrentTrust?.id && storeCurrentTrust?.id !== "");
      
      if (!trustExists) {
        const userTrustId = session?.user?.trustId;
        const matchingTrust = mappedTrusts.find((t) => t.id === userTrustId) || mappedTrusts[0];
        setCurrentTrust(matchingTrust);
      }
    }
  }, [trustsData, setTrusts, setCurrentTrust, session?.user?.trustId]);

  const [isTrustOpen, setIsTrustOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Fetch real notifications
  const { data: notificationsData } = useQuery({
    queryKey: ["notifications", currentTrust?.id],
    queryFn: async () => {
      if (!currentTrust?.id) return [];
      const res = await fetch(`/api/notifications?trustId=${currentTrust.id}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to load notifications");
      return json.data;
    },
    enabled: !!currentTrust?.id,
    refetchInterval: 60000, // Refetch every minute
  });

  const notifications = notificationsData || [];
  const unreadCount = notifications.length;

  const trustRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Click outside listener to close dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (trustRef.current && !trustRef.current.contains(event.target as Node)) {
        setIsTrustOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      ) {
        setIsNotificationsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Breadcrumb generator
  const getBreadcrumbs = () => {
    const segments = pathname.split("/").filter((item) => item);
    return segments.map((segment, index) => {
      const href = "/" + segments.slice(0, index + 1).join("/");
      const label = routeNameMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
      const isLast = index === segments.length - 1;

      return { href, label, isLast };
    });
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className={`sticky top-0 z-20 flex h-16 w-full min-w-0 items-center justify-between border-b border-slate-200 bg-white/85 px-4 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/80 md:px-6 shadow-sm transition-colors duration-200 ${className || ""}`}>
      
      {/* Left side: Sidebar trigger & Breadcrumbs */}
      <div className="flex items-center gap-3">
        {/* Toggle Button for Mobile Menu */}
        <button
          onClick={toggleMobileSidebar}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200 md:hidden transition-colors"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Toggle Button for Desktop (collapses/expands sidebar) */}
        <button
          onClick={toggleSidebar}
          className="hidden md:flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200 transition-colors"
          aria-label="Toggle sidebar panel"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Vertical Divider */}
        <span className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

        {/* Dynamic Breadcrumbs */}
        <nav className="flex items-center space-x-1.5 text-xs sm:text-sm font-medium" aria-label="Breadcrumb">
          <span className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer">
            GurSewa
          </span>
          {breadcrumbs.map((crumb) => (
            <React.Fragment key={crumb.href}>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600 shrink-0" />
              {crumb.isLast ? (
                <span className="text-slate-800 dark:text-slate-200 font-semibold truncate max-w-[120px] sm:max-w-[200px]">
                  {crumb.label}
                </span>
              ) : (
                <span className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors truncate max-w-[100px]">
                  {crumb.label}
                </span>
              )}
            </React.Fragment>
          ))}
        </nav>
      </div>

      {/* Right side: Trust Selector & User menu */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Trust/Gurudwara Selector Dropdown */}
        <div className="relative" ref={trustRef}>
          <button
            onClick={() => setIsTrustOpen(!isTrustOpen)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-850 dark:text-slate-200 shadow-sm transition-all duration-200 max-w-[180px] sm:max-w-[260px]"
          >
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-amber-500/10 text-amber-500">
              <Building className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col items-start text-left truncate leading-tight">
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate w-full">
                {currentTrust.name}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate w-full">
                {currentTrust.location}
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${isTrustOpen ? "rotate-180" : ""}`} />
          </button>

          <AnimatePresence>
            {isTrustOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-64 origin-top-right rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg ring-1 ring-black/5 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:ring-white/5 z-50"
              >
                <div className="px-2.5 py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Switch Gurudwara / Trust
                  </span>
                </div>
                <div className="mt-1.5 max-h-60 overflow-y-auto space-y-0.5">
                  {trusts.map((trust) => {
                    const isSelected = trust.id === currentTrust.id;
                    return (
                      <button
                        key={trust.id}
                        onClick={() => {
                          setCurrentTrust(trust);
                          setIsTrustOpen(false);
                          queryClient.invalidateQueries();
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition-colors duration-150 ${
                          isSelected
                            ? "bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400 font-semibold"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200"
                        }`}
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium">{trust.name}</span>
                          <span className="text-[9px] opacity-75">{trust.location}</span>
                        </div>
                        {isSelected && <Check className="h-3.5 w-3.5 text-amber-500" />}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {hasPermission("RECEIPT_CREATE") && (
            <button
              onClick={() => setIsReceiptModalOpen(true)}
              className="flex h-9 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-500/10 px-2.5 text-xs font-semibold text-emerald-600 hover:bg-emerald-500/20 shadow-sm transition-all duration-200 dark:border-emerald-900/40 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-emerald-400"
              title="New Receipt"
            >
              <Banknote className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">New Receipt</span>
            </button>
          )}

          {hasPermission("PAYMENT_CREATE") && (
            <button
              onClick={() => setIsPaymentModalOpen(true)}
              className="flex h-9 items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-500/10 px-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-500/20 shadow-sm transition-all duration-200 dark:border-rose-900/40 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-rose-400"
              title="New Payment"
            >
              <CreditCard className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">New Payment</span>
            </button>
          )}
        </div>

        {/* Notifications Icon */}
        <div className="relative" ref={notificationsRef}>
          <button
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-850 dark:hover:text-slate-200 shadow-sm transition-colors relative"
          >
            <Bell className="w-4.5 h-4.5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-orange-500 ring-2 ring-white dark:ring-slate-900" />
            )}
          </button>

          <AnimatePresence>
            {isNotificationsOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-80 origin-top-right rounded-xl border border-slate-200 bg-white p-3 shadow-lg ring-1 ring-black/5 dark:border-slate-800 dark:bg-slate-900 z-50"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Notifications</span>
                  {unreadCount > 0 && (
                    <button className="text-[10px] text-amber-500 hover:underline">Mark all read</button>
                  )}
                </div>
                <div className="mt-2 space-y-2.5 max-h-64 overflow-y-auto custom-scrollbar">
                  {notifications.length === 0 ? (
                    <div className="text-center py-4 text-[10px] text-slate-400">
                      No new notifications
                    </div>
                  ) : (
                    notifications.map((notif: any) => (
                      <div key={notif.id} className="flex gap-2.5 items-start rounded-lg p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer">
                        <span className={`flex h-2 w-2 mt-1.5 rounded-full shrink-0 ${notif.type === 'RECEIPT' ? 'bg-amber-500' : 'bg-orange-500'}`} />
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{notif.title}</span>
                          <span className="text-[10px] text-slate-400">{notif.message}</span>
                          <span className="text-[9px] text-slate-500 mt-0.5">
                            {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User Profile Dropdown Menu */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-1.5 sm:gap-2 p-1 rounded-full md:rounded-lg border border-slate-200 md:px-2.5 md:py-1.5 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-850 shadow-sm transition-all duration-200"
          >
            {/* User Initial / Avatar */}
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 text-white font-bold text-xs shadow-inner">
              {displayName
                .split(" ")
                .filter((n) => n !== "Sardar")
                .map((n) => n[0])
                .join("") || "JS"}
            </div>
            
            {/* Display user text on desktop */}
            <div className="hidden md:flex flex-col items-start text-left leading-tight max-w-[120px]">
              <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate w-full">
                {displayName}
              </span>
              <span className="text-[9px] text-slate-450 dark:text-slate-500 truncate w-full">
                {displayRole}
              </span>
            </div>
            <ChevronDown className="hidden md:block w-3.5 h-3.5 text-slate-400 shrink-0" />
          </button>

          <AnimatePresence>
            {isProfileOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg ring-1 ring-black/5 focus:outline-none dark:border-slate-800 dark:bg-slate-900 z-50"
              >
                {/* Header User info */}
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 text-left">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{displayName}</p>
                  <p className="text-[10px] text-slate-450 truncate mt-0.5">{displayEmail}</p>
                  <span className="inline-flex items-center gap-1 mt-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
                    <Shield className="w-2.5 h-2.5" />
                    {displayRole}
                  </span>
                </div>

                {/* Profile actions */}
                <div className="mt-1 space-y-0.5">
                  <button
                    onClick={() => {
                      setIsProfileOpen(false);
                      router.push("/settings");
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200 transition-colors"
                  >
                    <User className="h-4.5 w-4.5 text-slate-400" />
                    <span>My Profile</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsProfileOpen(false);
                      router.push("/reports");
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200 transition-colors"
                  >
                    <Activity className="h-4.5 w-4.5 text-slate-400" />
                    <span>System Logs</span>
                  </button>
                  <a
                    href="mailto:support@gurudwarasevaonline.com"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200 transition-colors"
                  >
                    <HelpCircle className="h-4.5 w-4.5 text-slate-400" />
                    <span>Help & Support</span>
                  </a>
                </div>

                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                {/* Logout Button */}
                <div className="p-0.5">
                  <button
                    onClick={() => {
                      setIsProfileOpen(false);
                      signOut({ callbackUrl: "/login" });
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                  >
                    <LogOut className="h-4.5 w-4.5 shrink-0" />
                    <span>Log Out</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ─── QUICK ACTION: NEW RECEIPT MODAL ─────────────────────────── */}
      <AnimatePresence>
        {isReceiptModalOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto custom-scrollbar">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsReceiptModalOpen(false)}
              className="fixed inset-0 bg-black/55 backdrop-blur-sm"
            />
            {/* Modal panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 md:p-8 shadow-2xl z-10 my-8 custom-scrollbar"
            >
              <button
                onClick={() => setIsReceiptModalOpen(false)}
                className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-250 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-4.5 w-4.5" />
              </button>

              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                Record New Receipt
              </h3>
              <p className="text-xs text-slate-450 dark:text-slate-550 mb-6">
                Fill details to record a receipt entry into the active trust ledger.
              </p>

              <ReceiptForm 
                onSuccess={() => {
                  queryClient.invalidateQueries({ queryKey: ["receipts", currentTrust?.id] });
                  queryClient.invalidateQueries({ queryKey: ["dashboardStats", currentTrust?.id] });
                  setIsReceiptModalOpen(false);
                }} 
                onCancel={() => setIsReceiptModalOpen(false)} 
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── QUICK ACTION: NEW PAYMENT MODAL ─────────────────────────── */}
      <AnimatePresence>
        {isPaymentModalOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto custom-scrollbar">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPaymentModalOpen(false)}
              className="fixed inset-0 bg-black/55 backdrop-blur-sm"
            />
            {/* Modal panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 md:p-8 shadow-2xl z-10 my-8 custom-scrollbar"
            >
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-250 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-4.5 w-4.5" />
              </button>

              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                Record New Payment
              </h3>
              <p className="text-xs text-slate-450 dark:text-slate-550 mb-6">
                Fill details to record a payment entry into the active trust ledger.
              </p>

              <PaymentForm 
                onSuccess={() => {
                  queryClient.invalidateQueries({ queryKey: ["payments", currentTrust?.id] });
                  queryClient.invalidateQueries({ queryKey: ["dashboardStats", currentTrust?.id] });
                  setIsPaymentModalOpen(false);
                }} 
                onCancel={() => setIsPaymentModalOpen(false)} 
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </header>
  );
}
