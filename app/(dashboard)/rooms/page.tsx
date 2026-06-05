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
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Loader2,
  Bed,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  X,
  Trash2,
  AlertCircle,

} from "lucide-react";
import RoomForm from "@/components/rooms/RoomForm";
import BulkRoomForm from "@/components/rooms/BulkRoomForm";
import { useDashboardStore } from "@/lib/store/useDashboardStore";
import { usePermissions } from "@/lib/hooks/usePermissions";

interface Room {
  id: string;
  roomNumber: string;
  name: string;
  type: string;
  capacity: number;
  ratePerDay: string;
  floor: string | null;
  status: "AVAILABLE" | "UNDER_MAINTENANCE" | "INACTIVE";
  description: string | null;
  amenities: string[] | null;
}

export default function RoomsPage() {
  const queryClient = useQueryClient();
  const { currentTrust } = useDashboardStore();
  const { hasPermission } = usePermissions();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "roomNumber", desc: false },
  ]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [errorAlert, setErrorAlert] = useState<string | null>(null);

  // Fetch rooms list
  const { data: rooms = [], isLoading, refetch } = useQuery<Room[]>({
    queryKey: ["rooms", currentTrust?.id],
    queryFn: async () => {
      const res = await fetch(`/api/rooms?trustId=${currentTrust?.id}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to load rooms");
      return json.data;
    },
  });

  // Toggle room status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/rooms/${id}?trustId=${currentTrust?.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to update room");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms", currentTrust?.id] });
    },
    onError: (err) => {
      setErrorAlert(err.message);
    },
  });

  // Delete room mutation
  const deleteRoomMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/rooms/${id}?trustId=${currentTrust?.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to delete room");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms", currentTrust?.id] });
      setErrorAlert(null);
    },
    onError: (err) => {
      setErrorAlert(err.message);
    },
  });

  const handleToggleStatus = useCallback((room: Room) => {
    const nextStatus =
      room.status === "AVAILABLE"
        ? "UNDER_MAINTENANCE"
        : room.status === "UNDER_MAINTENANCE"
        ? "INACTIVE"
        : "AVAILABLE";
    updateStatusMutation.mutate({ id: room.id, status: nextStatus });
  }, [updateStatusMutation]);

  const handleDeleteRoom = useCallback((room: Room) => {
    if (confirm(`Are you sure you want to delete Room ${room.roomNumber}?`)) {
      deleteRoomMutation.mutate(room.id);
    }
  }, [deleteRoomMutation]);

  // Define Columns
  const columns = React.useMemo<ColumnDef<Room>[]>(
    () => [
      {
        accessorKey: "roomNumber",
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <span>Room No</span>
            <ArrowUpDown className="h-3.5 w-3.5" />
          </button>
        ),
        cell: (info) => (
          <span className="font-bold text-slate-800 dark:text-slate-200">
            {info.getValue() as string}
          </span>
        ),
      },
      {
        accessorKey: "name",
        header: "Lodging Label",
        cell: (info) => {
          const row = info.row.original;
          return (
            <div>
              <p className="font-bold text-slate-900 dark:text-white">{row.name}</p>
              {row.floor && (
                <p className="text-[10px] text-slate-400 dark:text-slate-550 mt-0.5">
                  Floor: {row.floor}
                </p>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "type",
        header: "Type",
        cell: (info) => (
          <span className="text-[10px] font-bold text-slate-655 dark:text-slate-400">
            {info.getValue() as string}
          </span>
        ),
      },
      {
        accessorKey: "capacity",
        header: "Max Guests",
        cell: (info) => <span>{info.getValue() as number} Yatris</span>,
      },
      {
        accessorKey: "ratePerDay",
        header: "Seva Rate",
        cell: (info) => {
          const rate = parseFloat(info.getValue() as string);
          return (
            <span className="font-bold text-slate-800 dark:text-slate-200">
              ₹{rate.toFixed(0)}/night
            </span>
          );
        },
      },
      {
        id: "amenities",
        header: "Amenities",
        cell: (info) => {
          const ams = info.row.original.amenities as string[] | null;
          if (!ams || ams.length === 0) return <span className="text-slate-400">-</span>;
          return (
            <div className="flex flex-wrap gap-1 max-w-[200px]">
              {ams.map((am: string) => (
                <span
                  key={am}
                  className="inline-flex rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500 dark:text-slate-400"
                >
                  {am}
                </span>
              ))}
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: (info) => {
          const val = info.getValue() as string;
          const canUpdate = hasPermission("ROOM_UPDATE");
          return (
            <span
              onClick={() => {
                if (canUpdate) {
                  handleToggleStatus(info.row.original);
                }
              }}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[9px] font-bold transition-all ${
                canUpdate
                  ? "cursor-pointer hover:scale-105 active:scale-95"
                  : "cursor-default"
              } ${
                val === "AVAILABLE"
                  ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-450"
                  : val === "UNDER_MAINTENANCE"
                  ? "bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400"
                  : "bg-red-500/10 text-red-600 dark:bg-red-500/15 dark:text-red-400"
              }`}
              title={canUpdate ? "Click to cycle status" : undefined}
            >
              {val === "AVAILABLE"
                ? "Available"
                : val === "UNDER_MAINTENANCE"
                ? "Maintenance"
                : "Inactive"}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: (info) => {
          const canDelete = hasPermission("ROOM_DELETE");
          if (!canDelete) return null;
          return (
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleDeleteRoom(info.row.original)}
                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-md transition-colors"
                title="Delete Room"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        },
      },
    ],
    [handleDeleteRoom, handleToggleStatus, hasPermission]
  );

  // Table Setup
  const table = useReactTable({
    data: rooms,
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
    <div className="w-full min-w-0 space-y-6 text-xs font-semibold">
      {/* Action header bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-200">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
            <Bed className="h-5.5 w-5.5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Lodging Rooms</h2>
            <p className="text-xs text-slate-450 dark:text-slate-500 mt-0.5">
              Manage physical room catalog, guest capacity pricing, and lodging availability status
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {hasPermission("ROOM_CREATE") && (
            <>
              <button
                onClick={() => setIsBulkModalOpen(true)}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 px-4 py-2.5 text-xs font-bold transition-all active:scale-[0.98]"
              >
                <Plus className="h-4.5 w-4.5 text-amber-500" />
                <span>Bulk Add Rooms</span>
              </button>
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white px-4 py-2.5 text-xs font-bold shadow-md shadow-orange-950/10 transition-all active:scale-[0.98]"
              >
                <Plus className="h-4.5 w-4.5" />
                <span>Add Room</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Error alert toast */}
      {errorAlert && (
        <div className="flex items-center justify-between p-3 rounded-xl border border-red-200 bg-red-50 text-red-655 transition-all">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4.5 w-4.5 shrink-0" />
            <span className="text-[11px] font-medium">{errorAlert}</span>
          </div>
          <button onClick={() => setErrorAlert(null)} className="p-1 hover:bg-red-100 rounded-md">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Data table container */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors duration-200">
        {/* Search filter bar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={globalFilter ?? ""}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Search rooms by number, floor, or label..."
              className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 pl-10 pr-4 py-2 text-slate-800 dark:text-white outline-none focus:border-amber-500 transition-colors"
            />
          </div>
        </div>

        {/* View render state */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
            <p className="text-xs text-slate-400 font-medium animate-pulse">
              Retrieving rooms list...
            </p>
          </div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-20 text-slate-450 dark:text-slate-550">
            <p>No lodging rooms set up yet.</p>
            {hasPermission("ROOM_CREATE") && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="mt-3 text-xs font-semibold text-amber-600 hover:text-amber-700"
              >
                Add First Room
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

        {/* Pagination control */}
        {rooms.length > 0 && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 flex-wrap">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount() || 1} — Showing {table.getRowModel().rows.length} of{" "}
              {rooms.length} entries
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

      {/* ─── ADD ROOM MODAL ────────────────────────────────────────── */}
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
            {/* Form card */}
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
                Add New Room
              </h3>
              <p className="text-xs text-slate-450 dark:text-slate-550 mb-6">
                Register a new lodging room into the active trust catalog.
              </p>

              <RoomForm onSuccess={handleFormSuccess} onCancel={() => setIsModalOpen(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── BULK ADD ROOM MODAL ────────────────────────────────────── */}
      <AnimatePresence>
        {isBulkModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBulkModalOpen(false)}
              className="fixed inset-0 bg-black/55 backdrop-blur-sm"
            />
            {/* Form card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 md:p-8 shadow-2xl z-10 max-h-[90vh] overflow-y-auto"
            >
              <button
                onClick={() => setIsBulkModalOpen(false)}
                className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-650 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-4.5 w-4.5" />
              </button>

              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                Bulk Add Rooms
              </h3>
              <p className="text-xs text-slate-450 dark:text-slate-550 mb-6">
                Generate multiple sequential lodging rooms at once.
              </p>

              <BulkRoomForm
                onSuccess={() => {
                  refetch();
                  setIsBulkModalOpen(false);
                }}
                onCancel={() => setIsBulkModalOpen(false)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
