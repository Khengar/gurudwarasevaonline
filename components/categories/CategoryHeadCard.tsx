"use client";

import React from "react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { motion, AnimatePresence } from "framer-motion";
import {
  GripVertical,
  Plus,
  Edit2,
  Trash2,
  ChevronDown,
  Globe,
  CheckCircle2,
  MinusCircle,
} from "lucide-react";
import { CategoryHead, Category } from "./CategoryManager";
import { usePermissions } from "@/lib/hooks/usePermissions";

interface CategoryHeadCardProps {
  head: CategoryHead;
  index: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEditHead: (head: CategoryHead) => void;
  onDeleteHead: (headId: string) => void;
  onAddCategory: (headId: string) => void;
  onEditCategory: (category: Category) => void;
  onDeleteCategory: (categoryId: string) => void;
  onToggleCategoryActive: (category: Category) => void;
}

export default function CategoryHeadCard({
  head,
  index,
  isExpanded,
  onToggleExpand,
  onEditHead,
  onDeleteHead,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  onToggleCategoryActive,
}: CategoryHeadCardProps) {
  const { hasPermission } = usePermissions();
  return (
    <Draggable draggableId={head.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`rounded-2xl border bg-white shadow-sm transition-all duration-200 dark:bg-slate-900 ${
            snapshot.isDragging
              ? "border-amber-500 shadow-lg ring-2 ring-amber-500/10 dark:border-amber-500"
              : "border-slate-200 hover:border-slate-350 dark:border-slate-800"
          }`}
        >
          {/* Card Header Section */}
          <div className="flex items-center justify-between p-4 md:p-5">
            <div className="flex items-center gap-3 min-w-0">
              {/* Drag Handle */}
              {hasPermission("CATEGORY_UPDATE") && (
                <div
                  {...provided.dragHandleProps}
                  className="cursor-grab text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 active:cursor-grabbing shrink-0"
                >
                  <GripVertical className="h-5 w-5" />
                </div>
              )}

              {/* Head Meta */}
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-slate-900 dark:text-white truncate">
                    {head.name}
                  </h3>
                  {head.namePunjabi && (
                    <span className="inline-flex items-center gap-1 rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-650 dark:text-slate-450">
                      <Globe className="h-3 w-3 text-slate-400" />
                      {head.namePunjabi}
                    </span>
                  )}
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold ${
                      head.isActive
                        ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-450"
                        : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {head.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                  {head.categories.length} {head.categories.length === 1 ? "category" : "categories"}
                </p>
              </div>
            </div>

            {/* Actions Panel */}
            <div className="flex items-center gap-1 md:gap-2 shrink-0">
              {hasPermission("CATEGORY_UPDATE") && (
                <button
                  onClick={() => onEditHead(head)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 dark:hover:text-white dark:hover:bg-slate-850 rounded-lg transition-colors"
                  title="Edit Group"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
              )}
              {hasPermission("CATEGORY_DELETE") && (
                <button
                  onClick={() => onDeleteHead(head.id)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
                  title="Delete Group (Soft Delete)"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              
              <span className="w-px h-5 bg-slate-200 dark:bg-slate-800 mx-1" />

              <button
                onClick={onToggleExpand}
                className={`p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 dark:hover:text-white dark:hover:bg-slate-850 rounded-lg transition-all duration-200 ${
                  isExpanded ? "rotate-180 text-amber-500" : ""
                }`}
                title={isExpanded ? "Collapse" : "Expand"}
              >
                <ChevronDown className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>

          {/* Collapsible Accordion Body */}
          <AnimatePresence initial={false}>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="overflow-hidden border-t border-slate-100 dark:border-slate-800"
              >
                <div className="p-4 md:p-5 bg-slate-50/40 dark:bg-slate-900/30">
                  {/* Category Items List (Droppable area for categories) */}
                  <Droppable droppableId={head.id} type="CATEGORY">
                    {(droppableProvided, droppableSnapshot) => (
                      <div
                        ref={droppableProvided.innerRef}
                        {...droppableProvided.droppableProps}
                        className={`space-y-1.5 min-h-[40px] rounded-xl transition-colors ${
                          droppableSnapshot.isDraggingOver
                            ? "bg-amber-500/5 border border-dashed border-amber-500/20 p-2"
                            : ""
                        }`}
                      >
                        {head.categories.length === 0 ? (
                          <div className="text-center py-6 text-slate-450 dark:text-slate-550 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-white/50 dark:bg-slate-900/40">
                            <p className="text-xs">No categories added under this head yet.</p>
                            {hasPermission("CATEGORY_CREATE") && (
                              <button
                                onClick={() => onAddCategory(head.id)}
                                className="mt-2 text-xs font-semibold text-amber-600 hover:text-amber-700 inline-flex items-center gap-1"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                <span>Create First Category</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          head.categories.map((category, catIdx) => (
                            <Draggable
                              key={category.id}
                              draggableId={category.id}
                              index={catIdx}
                            >
                              {(draggableProvided, draggableSnapshot) => (
                                <div
                                  ref={draggableProvided.innerRef}
                                  {...draggableProvided.draggableProps}
                                  className={`flex items-center justify-between p-3 rounded-xl border bg-white transition-all ${
                                    draggableSnapshot.isDragging
                                      ? "border-amber-500 shadow-md ring-2 ring-amber-500/5 dark:bg-slate-950"
                                      : "border-slate-100 hover:border-slate-200 dark:border-slate-800 dark:bg-slate-950/40"
                                  }`}
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    {/* Drag Handle */}
                                    {hasPermission("CATEGORY_UPDATE") && (
                                      <div
                                        {...draggableProvided.dragHandleProps}
                                        className="cursor-grab text-slate-355 hover:text-slate-500 dark:hover:text-slate-300 p-0.5 rounded active:cursor-grabbing"
                                      >
                                        <GripVertical className="h-4 w-4" />
                                      </div>
                                    )}

                                    {/* Checkbox to Toggle Status */}
                                    <button
                                      onClick={() => {
                                        if (hasPermission("CATEGORY_UPDATE")) {
                                          onToggleCategoryActive(category);
                                        }
                                      }}
                                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all duration-150 ${
                                        category.isActive
                                          ? "border-emerald-500 bg-emerald-500 text-white shadow-sm shadow-emerald-550/20"
                                          : "border-slate-300 hover:border-slate-400 bg-white dark:border-slate-700 dark:bg-slate-900"
                                      } ${
                                        hasPermission("CATEGORY_UPDATE")
                                          ? "cursor-pointer"
                                          : "cursor-default opacity-80"
                                      }`}
                                      title={
                                        hasPermission("CATEGORY_UPDATE")
                                          ? category.isActive
                                            ? "Mark Inactive"
                                            : "Mark Active"
                                          : undefined
                                      }
                                    >
                                      {category.isActive ? (
                                        <CheckCircle2 className="h-3.5 w-3.5 stroke-[3px]" />
                                      ) : (
                                        <MinusCircle className="h-3.5 w-3.5 text-slate-350" />
                                      )}
                                    </button>

                                    {/* Category Title */}
                                    <div className="min-w-0 flex items-center gap-2">
                                      <span
                                        className={`text-xs font-semibold ${
                                          category.isActive
                                            ? "text-slate-700 dark:text-slate-200"
                                            : "text-slate-400 dark:text-slate-500 line-through"
                                        }`}
                                      >
                                        {category.name}
                                      </span>
                                      {category.namePunjabi && (
                                        <span className="text-[10px] text-slate-450 dark:text-slate-500 bg-slate-50 dark:bg-slate-900 px-1.5 py-0.5 rounded">
                                          {category.namePunjabi}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Item Actions */}
                                  <div className="flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
                                    {hasPermission("CATEGORY_UPDATE") && (
                                      <button
                                        onClick={() => onEditCategory(category)}
                                        className="p-1.5 text-slate-400 hover:text-slate-750 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-slate-800 rounded-md transition-colors"
                                        title="Edit Category"
                                      >
                                        <Edit2 className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                    {hasPermission("CATEGORY_DELETE") && (
                                      <button
                                        onClick={() => onDeleteCategory(category.id)}
                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-md transition-colors"
                                        title="Delete Category"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))
                        )}
                        {droppableProvided.placeholder}

                        {/* Inline Create Category Button if elements already exist */}
                        {head.categories.length > 0 && hasPermission("CATEGORY_CREATE") && (
                          <button
                            onClick={() => onAddCategory(head.id)}
                            className="flex items-center justify-center gap-1.5 w-full py-2 border border-dashed border-slate-200 hover:border-amber-500/40 text-slate-450 hover:text-amber-600 rounded-xl bg-white hover:bg-amber-500/5 text-xs font-semibold transition-all duration-200 dark:border-slate-800 dark:bg-slate-955/20"
                          >
                            <Plus className="h-4 w-4" />
                            <span>Add Category</span>
                          </button>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </Draggable>
  );
}
