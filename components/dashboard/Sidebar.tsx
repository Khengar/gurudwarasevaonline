"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useDashboardStore } from "@/lib/store/useDashboardStore";
import { useSession } from "next-auth/react";
import {
  Home,
  Receipt,
  Coins,
  Layers,
  BedDouble,
  CalendarDays,
  ArrowLeftRight,
  Settings,
  Users,
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
  FileSpreadsheet,
  Shield,
} from "lucide-react";

// Navigation Structure definitions
interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  groupName: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    groupName: "Core",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: Home },
    ],
  },
  {
    groupName: "Finance",
    items: [
      { name: "Receipts", href: "/receipts", icon: Receipt },
      { name: "Payments", href: "/payments", icon: Coins },
      { name: "Category Heads", href: "/categories/receipts", icon: Layers },
    ],
  },
  {
    groupName: "Yatris & Rooms",
    items: [
      { name: "Room Management", href: "/rooms", icon: BedDouble },
      { name: "Booking Desk", href: "/bookings", icon: CalendarDays },
      { name: "Check-In/Out", href: "/check-in", icon: ArrowLeftRight },
    ],
  },
  {
    groupName: "Reports",
    items: [
      { name: "Ledger Reports", href: "/reports", icon: FileSpreadsheet },
    ],
  },
  {
    groupName: "Administration",
    items: [
      { name: "Trust Settings", href: "/settings", icon: Settings },
      { name: "User Management", href: "/users", icon: Users },
    ],
  },
  {
    groupName: "Superadmin",
    items: [
      { name: "Trusts & Licenses", href: "/superadmin/trusts", icon: Shield },
    ],
  },
];

interface SidebarProps {
  className?: string;
}

export default function Sidebar({ className }: SidebarProps = {}) {
  const pathname = usePathname();
  const {
    isSidebarExpanded,
    isMobileSidebarOpen,
    toggleSidebar,
    setMobileSidebarOpen,
    currentUser,
  } = useDashboardStore();

  const { data: session } = useSession();
  const role = session?.user?.role || currentUser?.role;

  const filteredNavGroups = navGroups
    .map((group) => {
      const filteredItems = group.items.filter((item) => {
        if (item.href === "/users") {
          return role === "ADMIN" || role === "SUPERADMIN";
        }
        return true;
      });
      return {
        ...group,
        items: filteredItems,
      };
    })
    .filter((group) => {
      if (group.groupName === "Superadmin") {
        return role === "SUPERADMIN";
      }
      return group.items.length > 0;
    });

  const isLinkActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === href;
    }
    if (href.startsWith("/categories") && pathname.startsWith("/categories")) {
      return true;
    }
    return pathname.startsWith(href);
  };

  const getLinkClasses = (isActive: boolean, isExpanded: boolean) => {
    return `
      flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 group relative
      ${
        isActive
          ? "bg-gradient-to-r from-amber-500/15 to-orange-500/5 text-amber-500 border-l-2 border-amber-500 shadow-[inset_4px_0_12px_-4px_rgba(245,158,11,0.15)]"
          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border-l-2 border-transparent"
      }
      ${!isExpanded ? "justify-center px-2" : ""}
    `;
  };

  // Sidebar contents markup (reusable for both Desktop and Mobile)
  const SidebarContent = ({ isMobile = false }) => (
    <div className="flex flex-col h-full w-full bg-slate-950 border-r border-slate-900 text-white overflow-hidden">
      {/* Brand Header */}
      <div className={`flex items-center ${isSidebarExpanded || isMobile ? "justify-between px-6" : "justify-center px-2"} py-5 border-b border-slate-900 h-16 shrink-0`}>
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-600 shadow-md shadow-orange-900/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <AnimatePresence initial={false}>
            {(isSidebarExpanded || isMobile) && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden whitespace-nowrap"
              >
                <span className="font-bold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-amber-200 to-amber-100">
                  GurSewa
                </span>
                <span className="font-light text-slate-400 text-xs ml-1">Online</span>
              </motion.div>
            )}
          </AnimatePresence>
        </Link>

        {isMobile && (
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-900 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav Navigation List — flex-1 + min-h-0 so it shrinks and scrolls on small screens */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-3 custom-scrollbar scrollbar-thin scrollbar-thumb-slate-800">
        {filteredNavGroups.map((group, groupIdx) => (
          <div key={group.groupName} className="space-y-0.5">
            {(isSidebarExpanded || isMobile) ? (
              <motion.h4
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.05 * groupIdx }}
                className="text-[10px] font-bold tracking-widest text-slate-500 uppercase px-3 pb-1"
              >
                {group.groupName}
              </motion.h4>
            ) : (
              <div className="h-px bg-slate-900 my-3" />
            )}

            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isLinkActive(item.href);
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={getLinkClasses(active, isSidebarExpanded || isMobile)}
                      onClick={() => isMobile && setMobileSidebarOpen(false)}
                    >
                      <Icon className={`w-5 h-5 shrink-0 ${active ? "text-amber-500 animate-pulse-slow" : "text-slate-400 group-hover:text-slate-200 transition-colors"}`} />
                      
                      {(isSidebarExpanded || isMobile) && (
                        <motion.span
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="font-medium"
                        >
                          {item.name}
                        </motion.span>
                      )}

                      {/* Tooltip for Collapsed Sidebar */}
                      {!isSidebarExpanded && !isMobile && (
                        <div className="absolute left-full ml-4 px-2.5 py-1.5 bg-slate-900 text-slate-100 text-xs font-semibold rounded-md opacity-0 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-2 transition-all duration-200 pointer-events-none whitespace-nowrap shadow-lg border border-slate-800 z-50">
                          {item.name}
                        </div>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* Expand/Collapse Toggle Button for Desktop */}
      {!isMobile && (
        <div className="p-3 border-t border-slate-900 bg-slate-950/50 shrink-0">
          <button
            onClick={toggleSidebar}
            className="flex items-center justify-center w-full py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-all duration-200 border border-slate-800/80 shadow-sm"
          >
            {isSidebarExpanded ? (
              <div className="flex items-center gap-2 text-xs font-semibold">
                <ChevronLeft className="w-4 h-4" />
                <span>Collapse Panel</span>
              </div>
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        </div>
      )}
    </div>
  );


  return (
    <>
      {/* DESKTOP SIDEBAR - Persistent animatable with Framer Motion */}
      <motion.aside
        animate={{ width: isSidebarExpanded ? 256 : 80 }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
        className={`hidden md:flex md:flex-col h-full overflow-hidden shrink-0 z-30 ${className || ""}`}
      >
        <SidebarContent />
      </motion.aside>

      {/* MOBILE DRAWER SIDEBAR - Animated absolute overlay */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
            />
            {/* Drawer Panel */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="fixed top-0 bottom-0 left-0 w-72 h-screen z-50 md:hidden shadow-2xl"
            >
              <SidebarContent isMobile={true} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
