"use client";

import React from "react";
import Sidebar from "@/components/dashboard/Sidebar";
import Header from "@/components/dashboard/Header";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    /* The outer shell is exactly the viewport — no more, no less */
    <div className="fixed inset-0 flex overflow-hidden bg-background">
      <Sidebar className="h-full flex-shrink-0" />
      {/* Right column must have min-w-0 so it never forces the row wider */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <Header className="flex-shrink-0 min-w-0" />
        {/* Only this pane scrolls vertically. overflow-x-hidden kills any rogue x-bleed. */}
        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-4 md:p-6 custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
}
