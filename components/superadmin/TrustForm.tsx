"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, AlertCircle } from "lucide-react";

export interface TrustData {
  id: string;
  name: string;
  city: string | null;
  isActive: boolean;
  license?: {
    licenseKey: string;
    expiresAt: string | null;
  } | null;
  users?: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
  }>;
}

interface TrustFormProps {
  trust?: TrustData | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const trustSchema = z.object({
  name: z.string().min(2, "Gurudwara Name must be at least 2 characters"),
  city: z.string().min(2, "City must be at least 2 characters").optional().or(z.literal("")),
  isActive: z.boolean(),
  // Initial Admin Details
  adminName: z.string().optional().or(z.literal("")),
  adminEmail: z.string().optional().or(z.literal("")),
  adminPassword: z.string().optional().or(z.literal("")),
});

type TrustFormValues = z.infer<typeof trustSchema>;

export default function TrustForm({ trust, onSuccess, onCancel }: TrustFormProps) {
  const queryClient = useQueryClient();
  const isEdit = !!trust;

  const schema = React.useMemo(() => {
    return trustSchema.superRefine((data, ctx) => {
      if (!isEdit) {
        if (!data.adminName || data.adminName.trim().length < 2) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Admin Name is required and must be at least 2 characters",
            path: ["adminName"],
          });
        }
        if (!data.adminEmail || !/\S+@\S+\.\S+/.test(data.adminEmail)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "A valid Admin Email is required",
            path: ["adminEmail"],
          });
        }
        if (!data.adminPassword || data.adminPassword.length < 6) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Admin Password is required and must be at least 6 characters",
            path: ["adminPassword"],
          });
        }
      }
    });
  }, [isEdit]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TrustFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: trust?.name || "",
      city: trust?.city || "",
      isActive: trust ? trust.isActive : true,
      adminName: "",
      adminEmail: "",
      adminPassword: "",
    },
  });

  const saveTrustMutation = useMutation({
    mutationFn: async (values: TrustFormValues) => {
      if (isEdit) {
        // Edit flow
        const res = await fetch(`/api/trusts/${trust.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: values.name,
            city: values.city,
            isActive: values.isActive,
          }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || "Failed to update Gurudwara.");
        return json.data;
      } else {
        // Create flow:
        // 1. Generate License Key
        const licenseRes = await fetch("/api/licenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        const licenseJson = await licenseRes.json();
        if (!licenseJson.success) {
          throw new Error(licenseJson.error || "Failed to generate a license key.");
        }
        const licenseId = licenseJson.data.id;

        // 2. Create Trust along with admin
        const trustRes = await fetch("/api/trusts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: values.name,
            city: values.city,
            licenseId,
            adminName: values.adminName,
            adminEmail: values.adminEmail,
            adminPassword: values.adminPassword,
          }),
        });
        const trustJson = await trustRes.json();
        if (!trustJson.success) {
          throw new Error(trustJson.error || "Failed to create Gurudwara.");
        }
        return trustJson.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trusts"] });
      onSuccess();
    },
  });

  const onSubmit = (values: TrustFormValues) => {
    saveTrustMutation.mutate(values);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-xs font-semibold">
      {saveTrustMutation.isError && (
        <div className="flex items-center gap-2 p-3 rounded-xl border border-red-200 bg-red-50 text-red-650 dark:bg-red-950/20 dark:border-red-900/50 dark:text-red-400">
          <AlertCircle className="h-4.5 w-4.5 shrink-0" />
          <span className="text-[11px] font-medium">
            {saveTrustMutation.error.message}
          </span>
        </div>
      )}

      {/* Gurudwara (Trust) Name */}
      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500">
          Gurudwara / Trust Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          {...register("name")}
          placeholder="e.g. Gurudwara Saheb Secunderabad"
          className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all"
        />
        {errors.name && (
          <p className="text-[10px] text-red-500 font-semibold">{errors.name.message}</p>
        )}
      </div>

      {/* City */}
      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-slate-500">
          City <span className="text-red-550 dark:text-slate-450">(Optional)</span>
        </label>
        <input
          type="text"
          {...register("city")}
          placeholder="e.g. Hyderabad"
          className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all"
        />
        {errors.city && (
          <p className="text-[10px] text-red-500 font-semibold">{errors.city.message}</p>
        )}
      </div>

      {/* Initial Administrator Fields (Create Mode Only) */}
      {!isEdit && (
        <div className="pt-4 border-t border-slate-100 dark:border-slate-850 space-y-4">
          <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Initial Administrator Account
          </h4>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 -mt-2">
            This account will be created with Trust Administrator privileges.
          </p>

          {/* Admin Name */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500">
              Admin Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register("adminName")}
              placeholder="e.g. Sardar Gurmukh Singh"
              className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all"
            />
            {errors.adminName && (
              <p className="text-[10px] text-red-500 font-semibold">{errors.adminName.message}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Admin Email */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500">
                Admin Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                {...register("adminEmail")}
                placeholder="admin@gurudwara.org"
                className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all"
              />
              {errors.adminEmail && (
                <p className="text-[10px] text-red-500 font-semibold">{errors.adminEmail.message}</p>
              )}
            </div>

            {/* Admin Password */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-slate-500">
                Admin Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                {...register("adminPassword")}
                placeholder="••••••••"
                className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all"
              />
              {errors.adminPassword && (
                <p className="text-[10px] text-red-500 font-semibold">{errors.adminPassword.message}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* License Key Info (Read Only on Edit) */}
      {isEdit && trust?.license && (
        <div className="space-y-1 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 p-3 rounded-xl">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500">Linked License</p>
          <div className="flex justify-between items-center mt-1">
            <span className="font-mono text-xs text-amber-600 dark:text-amber-400 font-bold bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/10">
              {trust.license.licenseKey}
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">
              Expires: {trust.license.expiresAt ? new Date(trust.license.expiresAt).toLocaleDateString() : "Never"}
            </span>
          </div>
        </div>
      )}

      {/* Trust Active Status (Edit Mode only) */}
      {isEdit && (
        <div className="flex items-center gap-2.5 py-1">
          <input
            type="checkbox"
            id="trust-isActive"
            {...register("isActive")}
            className="h-4.5 w-4.5 rounded border-slate-300 text-amber-500 focus:ring-amber-500/20 accent-amber-500"
          />
          <label
            htmlFor="trust-isActive"
            className="text-xs font-semibold text-slate-700 dark:text-slate-350 cursor-pointer"
          >
            Gurudwara account is active
          </label>
        </div>
      )}

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
          disabled={saveTrustMutation.isPending}
          className="rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 text-white px-4 py-2.5 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
        >
          {saveTrustMutation.isPending && (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          )}
          <span>{isEdit ? "Save Changes" : "Register Gurudwara"}</span>
        </button>
      </div>
    </form>
  );
}
