"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, Calendar, AlertCircle } from "lucide-react";
import { CategoryHead } from "../categories/CategoryManager";
import { useDashboardStore } from "@/lib/store/useDashboardStore";

interface PaymentInitialData {
  id: string;
  payeeName: string;
  mobileNumber?: string | null;
  amount: string;
  paymentType: string;
  chequeNo?: string | null;
  bankName?: string | null;
  transactionId?: string | null;
  notes?: string | null;
  date: string;
  category: {
    id: string;
    head: { id: string };
  };
}

interface PaymentFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: PaymentInitialData;
}

// Zod validation schema with conditional checks
const paymentFormSchema = z
  .object({
    payeeName: z.string().min(2, "Payee Name must be at least 2 characters"),
    mobileNumber: z.string().optional().or(z.literal("")),
    amount: z.string().refine((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    }, "Amount must be a positive decimal number"),
    paymentType: z.string().min(1, "Please select a payment type"),
    chequeNo: z.string().optional().or(z.literal("")),
    bankName: z.string().optional().or(z.literal("")),
    transactionId: z.string().optional().or(z.literal("")),
    headId: z.string().min(1, "Please select a category head"),
    categoryId: z.string().min(1, "Please select a sub-category"),
    notes: z.string().optional().or(z.literal("")),
    date: z.string().min(1, "Date is required"),
  })
  .superRefine((data, ctx) => {
    if (data.paymentType === "CHEQUE") {
      if (!data.chequeNo) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Cheque Number is required for Cheque payments",
          path: ["chequeNo"],
        });
      }
      if (!data.bankName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Bank Name is required for Cheque payments",
          path: ["bankName"],
        });
      }
    }

    if (["UPI", "ONLINE", "NEFT", "RTGS"].includes(data.paymentType)) {
      if (!data.transactionId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Transaction/Ref ID is required for online payments",
          path: ["transactionId"],
        });
      }
    }
  });

type PaymentFormValues = z.infer<typeof paymentFormSchema>;

export default function PaymentForm({ onSuccess, onCancel, initialData }: PaymentFormProps) {
  const { currentTrust } = useDashboardStore();
  const todayStr = new Date().toISOString().split("T")[0];
  const isEditing = !!initialData;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      payeeName: initialData?.payeeName || "",
      mobileNumber: initialData?.mobileNumber || "",
      amount: initialData?.amount ? parseFloat(initialData.amount).toFixed(2) : "",
      paymentType: initialData?.paymentType || "CASH",
      chequeNo: initialData?.chequeNo || "",
      bankName: initialData?.bankName || "",
      transactionId: initialData?.transactionId || "",
      headId: initialData?.category?.head?.id || "",
      categoryId: initialData?.category?.id || "",
      notes: initialData?.notes || "",
      date: initialData?.date ? new Date(initialData.date).toISOString().split("T")[0] : todayStr,
    },
  });

  // Watch states for dependent dropdown and conditional fields
  const selectedHeadId = watch("headId");
  const paymentType = watch("paymentType");

  // Fetch CategoryHeads (type PAYMENT)
  const { data: categoryHeads = [], isLoading: isLoadingHeads } = useQuery<CategoryHead[]>({
    queryKey: ["category-heads", "PAYMENT", currentTrust?.id],
    queryFn: async () => {
      const res = await fetch(`/api/category-heads?type=PAYMENT&trustId=${currentTrust?.id}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to load categories");
      return json.data;
    },
  });

  // Find sub-categories of the active CategoryHead
  const activeHead = categoryHeads.find((h) => h.id === selectedHeadId);
  const categoriesList = activeHead ? activeHead.categories : [];

  // When categories load in edit mode, ensure headId and categoryId are set
  useEffect(() => {
    if (isEditing && initialData && categoryHeads.length > 0) {
      const headExists = categoryHeads.find((h) => h.id === initialData.category.head.id);
      if (headExists) {
        setValue("headId", initialData.category.head.id);
        setValue("categoryId", initialData.category.id);
      }
    }
  }, [categoryHeads, isEditing, initialData, setValue]);

  // Reset categoryId only when head changes (not on initial edit load)
  const prevHeadIdRef = React.useRef(initialData?.category?.head?.id || "");
  useEffect(() => {
    if (selectedHeadId !== prevHeadIdRef.current) {
      prevHeadIdRef.current = selectedHeadId;
      if (!isEditing || selectedHeadId !== initialData?.category?.head?.id) {
        setValue("categoryId", "");
      }
    }
  }, [selectedHeadId, setValue, isEditing, initialData]);

  // Unified mutation: POST for create, PUT for edit
  const savePaymentMutation = useMutation({
    mutationFn: async (values: PaymentFormValues) => {
      const url = isEditing
        ? `/api/payments/${initialData!.id}?trustId=${currentTrust?.id}`
        : `/api/payments?trustId=${currentTrust?.id}`;
      const method = isEditing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || `Failed to ${isEditing ? "update" : "save"} payment record`);
      return json.data;
    },
    onSuccess: () => {
      onSuccess();
    },
  });

  const onSubmit = (values: PaymentFormValues) => {
    savePaymentMutation.mutate(values);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-xs font-semibold">
      {savePaymentMutation.isError && (
        <div className="flex items-center gap-2 p-3 rounded-xl border border-red-200 bg-red-50 text-red-650">
          <AlertCircle className="h-4.5 w-4.5 shrink-0" />
          <span className="text-[11px] font-medium">
            {savePaymentMutation.error.message}
          </span>
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-slate-500">
            Payee Name / Supplier / Staff <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            {...register("payeeName")}
            placeholder="e.g. Sardar Jaspreet Singh"
            className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all"
          />
          {errors.payeeName && (
            <p className="text-[10px] text-red-500 font-semibold">{errors.payeeName.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-slate-500">
            Mobile Number
          </label>
          <input
            type="text"
            {...register("mobileNumber")}
            placeholder="e.g. 9876543210"
            className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-slate-500 flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>Transaction Date <span className="text-red-500">*</span></span>
          </label>
          <input
            type="date"
            {...register("date")}
            className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-slate-800 dark:text-white outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all"
          />
          {errors.date && (
            <p className="text-[10px] text-red-500 font-semibold">{errors.date.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-slate-500">
            Category Head Group <span className="text-red-500">*</span>
          </label>
          <select
            {...register("headId")}
            className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2.5 text-slate-800 dark:text-white outline-none focus:border-amber-500 transition-all"
          >
            <option value="">-- Select Head --</option>
            {isLoadingHeads ? (
              <option disabled>Loading groups...</option>
            ) : (
              categoryHeads.map((head) => (
                <option key={head.id} value={head.id}>
                  {head.name} {head.namePunjabi ? `(${head.namePunjabi})` : ""}
                </option>
              ))
            )}
          </select>
          {errors.headId && (
            <p className="text-[10px] text-red-500 font-semibold">{errors.headId.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-slate-500">
            Expense / Disbursement Category <span className="text-red-500">*</span>
          </label>
          <select
            {...register("categoryId")}
            disabled={!selectedHeadId}
            className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2.5 text-slate-800 dark:text-white outline-none focus:border-amber-500 transition-all disabled:opacity-50"
          >
            <option value="">-- Select Category --</option>
            {categoriesList.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name} {cat.namePunjabi ? `(${cat.namePunjabi})` : ""}
              </option>
            ))}
          </select>
          {errors.categoryId && (
            <p className="text-[10px] text-red-500 font-semibold">{errors.categoryId.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-slate-500">
            Payment Amount (INR) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            step="0.01"
            {...register("amount")}
            placeholder="0.00"
            className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all"
          />
          {errors.amount && (
            <p className="text-[10px] text-red-500 font-semibold">{errors.amount.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-slate-500">
            Payment Method <span className="text-red-500">*</span>
          </label>
          <select
            {...register("paymentType")}
            className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2.5 text-slate-800 dark:text-white outline-none focus:border-amber-500 transition-all"
          >
            <option value="CASH">CASH</option>
            <option value="CHEQUE">CHEQUE</option>
            <option value="UPI">UPI</option>
            <option value="ONLINE">ONLINE BANKING</option>
            <option value="NEFT">NEFT</option>
            <option value="RTGS">RTGS</option>
          </select>
        </div>
      </div>

      {/* Conditional: CHEQUE details */}
      {paymentType === "CHEQUE" && (
        <div className="grid gap-4 sm:grid-cols-2 p-3 bg-amber-500/5 rounded-xl border border-amber-500/10 transition-all duration-200">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-slate-500">
              Cheque Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register("chequeNo")}
              placeholder="e.g. 123456"
              className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-slate-800 dark:text-white outline-none focus:border-amber-500 transition-all"
            />
            {errors.chequeNo && (
              <p className="text-[10px] text-red-500 font-semibold">{errors.chequeNo.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-slate-500">
              Drawee Bank Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register("bankName")}
              placeholder="e.g. State Bank of India"
              className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-slate-800 dark:text-white outline-none focus:border-amber-500 transition-all"
            />
            {errors.bankName && (
              <p className="text-[10px] text-red-500 font-semibold">{errors.bankName.message}</p>
            )}
          </div>
        </div>
      )}

      {/* Conditional: UPI / Online Bank Transfer transaction ID */}
      {["UPI", "ONLINE", "NEFT", "RTGS"].includes(paymentType) && (
        <div className="p-3 bg-amber-500/5 rounded-xl border border-amber-500/10 transition-all duration-200">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-slate-500">
              Transaction ID / UTR Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register("transactionId")}
              placeholder="e.g. UTR1234567890"
              className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-slate-800 dark:text-white outline-none focus:border-amber-500 transition-all"
            />
            {errors.transactionId && (
              <p className="text-[10px] text-red-500 font-semibold">{errors.transactionId.message}</p>
            )}
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-slate-500">
          Disbursement Notes / Purpose / Voucher Remarks
        </label>
        <textarea
          {...register("notes")}
          rows={3}
          placeholder="Enter details like invoice reference, item count, receiver details, etc."
          className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all resize-none"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 px-4 py-2.5 text-xs font-bold transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={savePaymentMutation.isPending}
          className="rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 text-white px-4 py-2.5 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
        >
          {savePaymentMutation.isPending && (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          )}
          <span>{isEditing ? "Update Payment" : "Disburse Payment"}</span>
        </button>
      </div>
    </form>
  );
}
