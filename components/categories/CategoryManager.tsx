"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable, DropResult } from "@hello-pangea/dnd";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Loader2,
  FolderPlus,
  AlertCircle,
  HelpCircle,
  X,
  Globe,
  Settings2,
} from "lucide-react";
import CategoryHeadCard from "./CategoryHeadCard";
import { usePermissions } from "@/lib/hooks/usePermissions";

export interface Category {
  id: string;
  headId: string;
  trustId: string;
  name: string;
  namePunjabi: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryHead {
  id: string;
  trustId: string;
  type: "RECEIPT" | "PAYMENT";
  name: string;
  namePunjabi: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  categories: Category[];
}

interface CategoryManagerProps {
  type: "RECEIPT" | "PAYMENT";
}

// Zod validation schemas
const headSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name cannot exceed 50 characters"),
  namePunjabi: z.string().optional().or(z.literal("")),
  isActive: z.boolean(),
});

const categorySchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name cannot exceed 50 characters"),
  namePunjabi: z.string().optional().or(z.literal("")),
  isActive: z.boolean(),
});

type HeadFormValues = z.infer<typeof headSchema>;
type CategoryFormValues = z.infer<typeof categorySchema>;

export default function CategoryManager({ type }: CategoryManagerProps) {
  const queryClient = useQueryClient();
  const queryKey = ["category-heads", type];
  const { hasPermission } = usePermissions();

  // Accordion expanded heads mapping
  const [expandedHeads, setExpandedHeads] = useState<Record<string, boolean>>({});

  // Modals state
  const [headModal, setHeadModal] = useState<{
    isOpen: boolean;
    mode: "CREATE" | "EDIT";
    data?: CategoryHead;
  }>({ isOpen: false, mode: "CREATE" });

  const [categoryModal, setCategoryModal] = useState<{
    isOpen: boolean;
    mode: "CREATE" | "EDIT";
    headId?: string;
    data?: Category;
  }>({ isOpen: false, mode: "CREATE" });

  // ─── REACT HOOK FORM SETUPS ───────────────────────────────────────
  const {
    register: registerHead,
    handleSubmit: handleSubmitHead,
    reset: resetHead,
    formState: { errors: headErrors },
  } = useForm<HeadFormValues>({
    resolver: zodResolver(headSchema),
    defaultValues: { name: "", namePunjabi: "", isActive: true },
  });

  const {
    register: registerCategory,
    handleSubmit: handleSubmitCategory,
    reset: resetCategory,
    formState: { errors: categoryErrors },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "", namePunjabi: "", isActive: true },
  });

  // ─── API DATA FETCHING ──────────────────────────────────────────
  const {
    data: categoryHeads = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<CategoryHead[]>({
    queryKey,
    queryFn: async () => {
      const res = await fetch(`/api/category-heads?type=${type}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to load database");
      return json.data;
    },
  });

  // ─── API MUTATIONS ───────────────────────────────────────────────
  const createHeadMutation = useMutation({
    mutationFn: async (data: HeadFormValues) => {
      const res = await fetch("/api/category-heads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, type }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      refetch();
      setHeadModal({ isOpen: false, mode: "CREATE" });
      resetHead();
    },
  });

  const updateHeadMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CategoryHead> }) => {
      const res = await fetch(`/api/category-heads/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      refetch();
      setHeadModal({ isOpen: false, mode: "CREATE" });
      resetHead();
    },
  });

  const deleteHeadMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/category-heads/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => refetch(),
  });

  const createCategoryMutation = useMutation({
    mutationFn: async ({ headId, data }: { headId: string; data: CategoryFormValues }) => {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, headId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: (newCat) => {
      refetch();
      setCategoryModal({ isOpen: false, mode: "CREATE" });
      resetCategory();
      // Keep parent expanded after adding category
      setExpandedHeads((prev) => ({ ...prev, [newCat.headId]: true }));
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Category> }) => {
      const res = await fetch(`/api/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      refetch();
      setCategoryModal({ isOpen: false, mode: "CREATE" });
      resetCategory();
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => refetch(),
  });

  // ─── DRAG & DROP HANDLERS (OPTIMISTIC UPDATES) ───────────────────
  const handleDragEnd = async (result: DropResult) => {
    if (!hasPermission("CATEGORY_UPDATE")) return;
    const { destination, source, type: dragType } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const previousHeads = queryClient.getQueryData<CategoryHead[]>(queryKey) || [];
    let newHeads = JSON.parse(JSON.stringify(previousHeads)) as CategoryHead[];

    if (dragType === "HEAD") {
      // Reorder CategoryHeads
      const [removed] = newHeads.splice(source.index, 1);
      newHeads.splice(destination.index, 0, removed);

      // Recompute sortOrders
      newHeads = newHeads.map((h, idx) => ({ ...h, sortOrder: idx }));

      // Optimistically update query client
      queryClient.setQueryData(queryKey, newHeads);

      try {
        // Put updates to DB in parallel for heads whose order changed
        const updatePromises = newHeads.map((head, idx) => {
          const originalHead = previousHeads.find((h) => h.id === head.id);
          if (originalHead && originalHead.sortOrder !== idx) {
            return fetch(`/api/category-heads/${head.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sortOrder: idx }),
            });
          }
          return null;
        }).filter(Boolean);

        await Promise.all(updatePromises);
      } catch {
        // Rollback
        queryClient.setQueryData(queryKey, previousHeads);
      }
    } else if (dragType === "CATEGORY") {
      // Find parent head
      const headIdx = newHeads.findIndex((h) => h.id === source.droppableId);
      if (headIdx === -1) return;

      const parentHead = newHeads[headIdx];
      const [removed] = parentHead.categories.splice(source.index, 1);
      parentHead.categories.splice(destination.index, 0, removed);

      // Recompute sortOrders
      parentHead.categories = parentHead.categories.map((c, idx) => ({
        ...c,
        sortOrder: idx,
      }));

      queryClient.setQueryData(queryKey, newHeads);

      try {
        const updatePromises = parentHead.categories.map((cat, idx) => {
          const originalCat = previousHeads[headIdx].categories.find((c) => c.id === cat.id);
          if (originalCat && originalCat.sortOrder !== idx) {
            return fetch(`/api/categories/${cat.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sortOrder: idx }),
            });
          }
          return null;
        }).filter(Boolean);

        await Promise.all(updatePromises);
      } catch {
        queryClient.setQueryData(queryKey, previousHeads);
      }
    }
  };

  // ─── CLICK HANDLERS FOR ACTIONS ──────────────────────────────
  const toggleExpand = (id: string) => {
    setExpandedHeads((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleOpenCreateHead = () => {
    resetHead({ name: "", namePunjabi: "", isActive: true });
    setHeadModal({ isOpen: true, mode: "CREATE" });
  };

  const handleOpenEditHead = (head: CategoryHead) => {
    resetHead({
      name: head.name,
      namePunjabi: head.namePunjabi || "",
      isActive: head.isActive,
    });
    setHeadModal({ isOpen: true, mode: "EDIT", data: head });
  };

  const handleOpenCreateCategory = (headId: string) => {
    resetCategory({ name: "", namePunjabi: "", isActive: true });
    setCategoryModal({ isOpen: true, mode: "CREATE", headId });
  };

  const handleOpenEditCategory = (category: Category) => {
    resetCategory({
      name: category.name,
      namePunjabi: category.namePunjabi || "",
      isActive: category.isActive,
    });
    setCategoryModal({
      isOpen: true,
      mode: "EDIT",
      headId: category.headId,
      data: category,
    });
  };

  // Form submission execution
  const onHeadFormSubmit = (values: HeadFormValues) => {
    if (headModal.mode === "CREATE") {
      createHeadMutation.mutate(values);
    } else if (headModal.mode === "EDIT" && headModal.data) {
      updateHeadMutation.mutate({ id: headModal.data.id, data: values });
    }
  };

  const onCategoryFormSubmit = (values: CategoryFormValues) => {
    if (categoryModal.mode === "CREATE" && categoryModal.headId) {
      createCategoryMutation.mutate({ headId: categoryModal.headId, data: values });
    } else if (categoryModal.mode === "EDIT" && categoryModal.data) {
      updateCategoryMutation.mutate({ id: categoryModal.data.id, data: values });
    }
  };

  const handleToggleCategoryActive = (category: Category) => {
    updateCategoryMutation.mutate({
      id: category.id,
      data: { isActive: !category.isActive },
    });
  };

  return (
    <div className="w-full min-w-0 space-y-6">
      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-200 dark:border-slate-850 gap-6">
        <Link
          href="/categories/receipts"
          className={`pb-3 text-sm font-bold border-b-2 transition-all relative ${
            type === "RECEIPT"
              ? "border-amber-500 text-amber-600 dark:text-amber-400"
              : "border-transparent text-slate-400 hover:text-slate-650 dark:hover:text-slate-300"
          }`}
        >
          Receipt Categories
        </Link>
        <Link
          href="/categories/payments"
          className={`pb-3 text-sm font-bold border-b-2 transition-all relative ${
            type === "PAYMENT"
              ? "border-amber-500 text-amber-600 dark:text-amber-400"
              : "border-transparent text-slate-400 hover:text-slate-650 dark:hover:text-slate-300"
          }`}
        >
          Payment Categories
        </Link>
      </div>

      {/* Header operations bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-200">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
            <Settings2 className="h-5.5 w-5.5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">
              {type === "RECEIPT" ? "Receipt Categories" : "Payment Categories"}
            </h2>
            <p className="text-xs text-slate-450 dark:text-slate-500 mt-0.5">
              Drag-and-drop groups and sub-items to manage financial ledgers
            </p>
          </div>
        </div>

        {hasPermission("CATEGORY_CREATE") && (
          <button
            onClick={handleOpenCreateHead}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white px-4 py-2.5 text-xs font-bold shadow-md shadow-orange-950/10 transition-all active:scale-[0.98]"
          >
            <FolderPlus className="h-4.5 w-4.5" />
            <span>Add Category Head</span>
          </button>
        )}
      </div>

      {/* Main categories tree content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
          <p className="text-xs text-slate-400 font-medium animate-pulse">Loading categories database...</p>
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 rounded-2xl border border-dashed border-red-200 bg-red-50/10 text-center p-6 max-w-lg mx-auto">
          <AlertCircle className="h-8 w-8 text-red-500" />
          <h4 className="font-bold text-red-500 text-sm">Database Fetch Failure</h4>
          <p className="text-xs text-slate-500">{error?.message || "An unknown database error occurred."}</p>
          <button
            onClick={() => refetch()}
            className="mt-2 text-xs font-bold bg-white text-slate-700 hover:bg-slate-50 px-3.5 py-2 rounded-lg border border-slate-200 shadow-sm transition-colors"
          >
            Try Reconnecting
          </button>
        </div>
      ) : categoryHeads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50/20 text-center p-8">
          <HelpCircle className="h-10 w-10 text-slate-350 dark:text-slate-655" />
          <h3 className="font-bold text-slate-800 dark:text-slate-200 mt-3 text-sm">No Ledger Heads Formed</h3>
          <p className="text-xs text-slate-450 dark:text-slate-500 mt-1 max-w-sm">
            Categories are mapped under ledger heads. Form your first Category Head to start logging receipts and payments.
          </p>
          {hasPermission("CATEGORY_CREATE") && (
            <button
              onClick={handleOpenCreateHead}
              className="mt-4 flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Create First Head</span>
            </button>
          )}
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="heads" type="HEAD">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="space-y-4"
              >
                {categoryHeads.map((head, idx) => (
                  <CategoryHeadCard
                    key={head.id}
                    head={head}
                    index={idx}
                    isExpanded={!!expandedHeads[head.id]}
                    onToggleExpand={() => toggleExpand(head.id)}
                    onEditHead={handleOpenEditHead}
                    onDeleteHead={(id) => {
                      if (confirm("Are you sure you want to soft-delete this category head?")) {
                        deleteHeadMutation.mutate(id);
                      }
                    }}
                    onAddCategory={handleOpenCreateCategory}
                    onEditCategory={handleOpenEditCategory}
                    onDeleteCategory={(id) => {
                      if (confirm("Are you sure you want to soft-delete this category?")) {
                        deleteCategoryMutation.mutate(id);
                      }
                    }}
                    onToggleCategoryActive={handleToggleCategoryActive}
                  />
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {/* ─── CATEGORY HEAD MODAL FORM ────────────────────────────────── */}
      <AnimatePresence>
        {headModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setHeadModal({ isOpen: false, mode: "CREATE" })}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            />
            {/* Form Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl z-10"
            >
              <button
                onClick={() => setHeadModal({ isOpen: false, mode: "CREATE" })}
                className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-250 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-4.5 w-4.5" />
              </button>

              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                {headModal.mode === "CREATE" ? "New Category Head" : "Edit Category Head"}
              </h3>
              <p className="text-xs text-slate-450 dark:text-slate-550 mb-5">
                {type === "RECEIPT" ? "Receipt Ledger Group" : "Payment Ledger Group"}
              </p>

              <form onSubmit={handleSubmitHead(onHeadFormSubmit)} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Group Name (English) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...registerHead("name")}
                    placeholder="e.g. LANGAR SEWA"
                    className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all duration-150"
                  />
                  {headErrors.name && (
                    <p className="text-[10px] font-semibold text-red-500 mt-1">{headErrors.name.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    <span>Punjabi Translation (Optional)</span>
                  </label>
                  <input
                    type="text"
                    {...registerHead("namePunjabi")}
                    placeholder="ਲੰਗਰ ਸੇਵਾ"
                    className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all duration-150"
                  />
                </div>

                <div className="flex items-center gap-2.5 py-1.5">
                  <input
                    type="checkbox"
                    id="head-isActive"
                    {...registerHead("isActive")}
                    className="h-4.5 w-4.5 rounded border-slate-350 text-amber-500 focus:ring-amber-500/20 accent-amber-500"
                  />
                  <label htmlFor="head-isActive" className="text-xs font-semibold text-slate-700 dark:text-slate-350 cursor-pointer">
                    Enable category head immediately
                  </label>
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setHeadModal({ isOpen: false, mode: "CREATE" })}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-950 px-4 py-2.5 text-xs font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createHeadMutation.isPending || updateHeadMutation.isPending}
                    className="rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 text-white px-4 py-2.5 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    {(createHeadMutation.isPending || updateHeadMutation.isPending) && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    )}
                    <span>{headModal.mode === "CREATE" ? "Create Group" : "Save Changes"}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── CATEGORY MODAL FORM ─────────────────────────────────────── */}
      <AnimatePresence>
        {categoryModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCategoryModal({ isOpen: false, mode: "CREATE" })}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            />
            {/* Form Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl z-10"
            >
              <button
                onClick={() => setCategoryModal({ isOpen: false, mode: "CREATE" })}
                className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-250 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-4.5 w-4.5" />
              </button>

              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                {categoryModal.mode === "CREATE" ? "New Sub-Category" : "Edit Sub-Category"}
              </h3>
              <p className="text-xs text-slate-450 dark:text-slate-550 mb-5">
                Maps directly to ledger line receipts
              </p>

              <form onSubmit={handleSubmitCategory(onCategoryFormSubmit)} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Category Name (English) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...registerCategory("name")}
                    placeholder="e.g. DARSHAN BHETA"
                    className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all duration-150"
                  />
                  {categoryErrors.name && (
                    <p className="text-[10px] font-semibold text-red-500 mt-1">{categoryErrors.name.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    <span>Punjabi Translation (Optional)</span>
                  </label>
                  <input
                    type="text"
                    {...registerCategory("namePunjabi")}
                    placeholder="ਦਰਸ਼ਨ ਭੇਟਾ"
                    className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all duration-150"
                  />
                </div>

                <div className="flex items-center gap-2.5 py-1.5">
                  <input
                    type="checkbox"
                    id="cat-isActive"
                    {...registerCategory("isActive")}
                    className="h-4.5 w-4.5 rounded border-slate-350 text-amber-500 focus:ring-amber-500/20 accent-amber-500"
                  />
                  <label htmlFor="cat-isActive" className="text-xs font-semibold text-slate-700 dark:text-slate-350 cursor-pointer">
                    Enable category immediately
                  </label>
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setCategoryModal({ isOpen: false, mode: "CREATE" })}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-950 px-4 py-2.5 text-xs font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
                    className="rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 text-white px-4 py-2.5 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    {(createCategoryMutation.isPending || updateCategoryMutation.isPending) && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    )}
                    <span>{categoryModal.mode === "CREATE" ? "Create Category" : "Save Changes"}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
