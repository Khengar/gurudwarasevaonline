"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
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
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Loader2,
  Building2,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  X,
  Edit,
  AlertCircle,
  KeyRound,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import TrustForm, { TrustData } from "@/components/superadmin/TrustForm";

export default function TrustsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTrust, setSelectedTrust] = useState<TrustData | null>(null);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "name", desc: false },
  ]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [errorAlert, setErrorAlert] = useState<string | null>(null);

  // Client-side session and role check
  useEffect(() => {
    if (status === "unauthenticated" || (status === "authenticated" && session?.user?.role !== "SUPERADMIN")) {
      router.push("/dashboard");
    }
  }, [session, status, router]);

  // Fetch trusts list
  const { data: trusts = [], isLoading, refetch } = useQuery<TrustData[]>({
    queryKey: ["trusts"],
    queryFn: async () => {
      const res = await fetch("/api/trusts");
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to load Gurudwara list");
      return json.data;
    },
    enabled: status === "authenticated" && session?.user?.role === "SUPERADMIN",
  });

  // Toggle trust status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/trusts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to toggle status.");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trusts"] });
      setErrorAlert(null);
    },
    onError: (err) => {
      setErrorAlert(err.message);
    },
  });

  const handleEdit = useCallback((trust: TrustData) => {
    setSelectedTrust(trust);
    setIsModalOpen(true);
  }, []);

  const handleAdd = useCallback(() => {
    setSelectedTrust(null);
    setIsModalOpen(true);
  }, []);

  const handleFormSuccess = () => {
    refetch();
    setIsModalOpen(false);
    setSelectedTrust(null);
  };

  // Table Columns Definition
  const columns = React.useMemo<ColumnDef<TrustData>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <span>Gurudwara Name</span>
            <ArrowUpDown className="h-3.5 w-3.5" />
          </button>
        ),
        cell: (info) => (
          <span className="font-bold text-slate-800 dark:text-white uppercase">
            {info.getValue() as string}
          </span>
        ),
      },
      {
        accessorKey: "city",
        header: "City",
        cell: (info) => {
          const val = info.getValue() as string | null;
          return (
            <span className="text-slate-600 dark:text-slate-350">{val || "N/A"}</span>
          );
        },
      },
      {
        id: "primaryAdmin",
        header: "Primary Admin",
        cell: (info) => {
          const row = info.row.original;
          const admin = row.users && row.users[0];
          if (!admin) return <span className="text-slate-400 dark:text-slate-500">Not Assigned</span>;
          return (
            <div className="flex flex-col text-left">
              <span className="font-bold text-slate-700 dark:text-slate-350">{admin.name}</span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">{admin.email}</span>
            </div>
          );
        },
      },
      {
        id: "licenseKey",
        header: "License Key",
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/10 w-fit">
              <KeyRound className="h-3 w-3" />
              {row.license?.licenseKey || "No License"}
            </div>
          );
        },
      },
      {
        id: "expiresAt",
        header: "Expiration Date",
        cell: (info) => {
          const row = info.row.original;
          const expiresAt = row.license?.expiresAt;
          if (!expiresAt) return <span className="text-slate-400 dark:text-slate-500">Never</span>;

          const date = new Date(expiresAt);
          const isExpired = date < new Date();
          return (
            <span
              className={`font-semibold ${
                isExpired ? "text-rose-500 font-bold" : "text-slate-600 dark:text-slate-350"
              }`}
            >
              {date.toLocaleDateString()} {isExpired && "(EXPIRED)"}
            </span>
          );
        },
      },
      {
        accessorKey: "isActive",
        header: "Status",
        cell: (info) => {
          const val = info.getValue() as boolean;
          const row = info.row.original;
          return (
            <button
              onClick={() => toggleStatusMutation.mutate({ id: row.id, isActive: !val })}
              title="Click to toggle status"
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[9px] font-bold transition-all active:scale-[0.96] ${
                val
                  ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
                  : "bg-rose-500/10 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400"
              }`}
            >
              {val ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
              {val ? "ACTIVE" : "INACTIVE"}
            </button>
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
                onClick={() => handleEdit(row)}
                title="Edit Gurudwara Details"
                className="p-1.5 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
              >
                <Edit className="h-4 w-4" />
              </button>
            </div>
          );
        },
      },
    ],
    [toggleStatusMutation, handleEdit]
  );

  const table = useReactTable({
    data: trusts,
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

  if (status === "loading" || !session || session.user.role !== "SUPERADMIN") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
        <p className="text-xs text-slate-455 font-medium animate-pulse">Verifying credentials...</p>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-6 text-xs font-semibold">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-200">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
            <Building2 className="h-5.5 w-5.5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white uppercase tracking-wider">
              Gurudwara Directory & Licenses
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-450 mt-0.5">
              System-wide operations: Register new Gurudwara Trusts, generate licensing keys, and monitor status.
            </p>
          </div>
        </div>

        <button
          onClick={handleAdd}
          className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white px-4 py-2.5 text-xs font-bold shadow-md shadow-orange-950/10 transition-all active:scale-[0.98]"
        >
          <Plus className="h-4.5 w-4.5" />
          <span>Register Gurudwara</span>
        </button>
      </div>

      {/* Error alert toast */}
      {errorAlert && (
        <div className="flex items-center justify-between p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 transition-all">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4.5 w-4.5 shrink-0" />
            <span className="text-[11px] font-medium">{errorAlert}</span>
          </div>
          <button onClick={() => setErrorAlert(null)} className="p-1 hover:bg-red-100 rounded-md">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors duration-200">
        {/* Search */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={globalFilter ?? ""}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Search Gurudwaras by name or city..."
              className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 pl-10 pr-4 py-2 text-slate-800 dark:text-white outline-none focus:border-amber-500 transition-colors"
            />
          </div>
        </div>

        {/* List Content */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
            <p className="text-xs text-slate-455 font-medium animate-pulse">
              Retrieving registered Gurudwaras...
            </p>
          </div>
        ) : trusts.length === 0 ? (
          <div className="text-center py-20 text-slate-450 dark:text-slate-550">
            <p>No Gurudwaras onboarding records found.</p>
            <button
              onClick={handleAdd}
              className="mt-3 text-xs font-semibold text-amber-600 hover:text-amber-700"
            >
              Register First Gurudwara
            </button>
          </div>
        ) : (
          <div className="max-w-full overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                {table.getHeaderGroups().map((group) => (
                  <tr
                     key={group.id}
                     className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-500"
                  >
                    {group.headers.map((header) => (
                      <th key={header.id} className="px-3 py-2.5 font-bold">
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

            {/* Pagination */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-455 bg-slate-50/50 dark:bg-slate-900/40">
              <span className="text-[10px] uppercase tracking-wider">
                Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()} (
                {trusts.length} Gurudwaras onboarding records)
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

      {/* ─── ADD/EDIT TRUST MODAL ──────────────────────────────── */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-black/55 backdrop-blur-sm"
            />
            {/* Form Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 md:p-8 shadow-2xl z-10 max-h-[90vh] overflow-y-auto"
            >
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-650 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-4.5 w-4.5" />
              </button>

              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                {selectedTrust ? "Edit Gurudwara Details" : "Register New Gurudwara"}
              </h3>
              <p className="text-xs text-slate-450 dark:text-slate-550 mb-6">
                {selectedTrust
                  ? "Update name, city status or toggle activity of the organization."
                  : "Onboard new Gurudwara Saheb, system automatically issues a license token key."}
              </p>

              <TrustForm
                trust={selectedTrust}
                onSuccess={handleFormSuccess}
                onCancel={() => setIsModalOpen(false)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
