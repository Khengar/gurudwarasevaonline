"use client";

import React from "react";
import ReportGenerator from "@/components/reports/ReportGenerator";

export default function ReportsPage() {
  return (
    <div className="w-full min-w-0 space-y-6 py-2">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Reports & Ledgers Desk
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Query financial receipts, payment vouchers, and generate audit-compliant trust reports.
          </p>
        </div>
      </div>

      {/* Main reporting engine workspace */}
      <ReportGenerator />
    </div>
  );
}
