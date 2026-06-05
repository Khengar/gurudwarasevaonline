"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, AlertCircle } from "lucide-react";

export interface UserData {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "USER" | string;
  isActive: boolean;
  permissions?: string[];
}

interface UserFormProps {
  user?: UserData | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const baseUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  role: z.enum(["ADMIN", "USER"]),
  isActive: z.boolean(),
  password: z.string().optional().or(z.literal("")),
  permissions: z.array(z.string()),
});

type UserFormValues = z.infer<typeof baseUserSchema>;

export default function UserForm({ user, onSuccess, onCancel }: UserFormProps) {
  const queryClient = useQueryClient();
  const isEdit = !!user;

  const schema = React.useMemo(() => {
    return baseUserSchema.superRefine((data, ctx) => {
      if (!isEdit && (!data.password || data.password.length < 6)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Password must be at least 6 characters",
          path: ["password"],
        });
      }
    });
  }, [isEdit]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      role: (user?.role as "ADMIN" | "USER") || "USER",
      isActive: user ? user.isActive : true,
      password: "",
      permissions: user?.permissions || [],
    },
  });

  const selectedRole = watch("role");
  const selectedPermissions = watch("permissions") || [];

  const permissionGroups = [
    {
      name: "Financials",
      permissions: [
        { id: "RECEIPT_CREATE", label: "Create Receipts" },
        { id: "RECEIPT_UPDATE", label: "Update Receipts" },
        { id: "RECEIPT_DELETE", label: "Delete Receipts" },
        { id: "PAYMENT_CREATE", label: "Create Payments" },
        { id: "PAYMENT_UPDATE", label: "Update Payments" },
        { id: "PAYMENT_DELETE", label: "Delete Payments" },
      ],
    },
    {
      name: "Lodging (Yatri Nivas)",
      permissions: [
        { id: "ROOM_CREATE", label: "Create Rooms" },
        { id: "ROOM_UPDATE", label: "Update Rooms" },
        { id: "ROOM_DELETE", label: "Delete Rooms" },
        { id: "BOOKING_CREATE", label: "Create Bookings" },
        { id: "BOOKING_UPDATE", label: "Update Bookings" },
        { id: "BOOKING_DELETE", label: "Delete Bookings" },
      ],
    },
    {
      name: "Category & Settings",
      permissions: [
        { id: "CATEGORY_CREATE", label: "Create Categories" },
        { id: "CATEGORY_UPDATE", label: "Update Categories" },
        { id: "CATEGORY_DELETE", label: "Delete Categories" },
        { id: "SETTINGS_UPDATE", label: "Update Settings" },
      ],
    },
    {
      name: "Reports",
      permissions: [
        { id: "REPORT_VIEW", label: "View Reports" },
        { id: "REPORT_EXPORT", label: "Export Reports" },
      ],
    },
  ];

  const saveUserMutation = useMutation({
    mutationFn: async (values: UserFormValues) => {
      const url = isEdit ? `/api/users/${user.id}` : "/api/users";
      const method = isEdit ? "PUT" : "POST";

      // Prune empty password on edit
      const payload = { ...values };
      if (isEdit && !payload.password) {
        delete payload.password;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to save user info.");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      onSuccess();
    },
  });

  const onSubmit = (values: UserFormValues) => {
    saveUserMutation.mutate(values);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-xs font-semibold">
      {saveUserMutation.isError && (
        <div className="flex items-center gap-2 p-3 rounded-xl border border-red-200 bg-red-50 text-red-650">
          <AlertCircle className="h-4.5 w-4.5 shrink-0" />
          <span className="text-[11px] font-medium">
            {saveUserMutation.error.message}
          </span>
        </div>
      )}

      {/* Staff Name */}
      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500">
          Staff Full Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          {...register("name")}
          placeholder="e.g. Bhai Ranjit Singh"
          className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all"
        />
        {errors.name && (
          <p className="text-[10px] text-red-500 font-semibold">{errors.name.message}</p>
        )}
      </div>

      {/* Email Address */}
      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-slate-500">
          Email Address <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          {...register("email")}
          placeholder="e.g. ranjit@gurudwara.org"
          className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all"
        />
        {errors.email && (
          <p className="text-[10px] text-red-500 font-semibold">{errors.email.message}</p>
        )}
      </div>

      {/* Password and Role */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Password */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-slate-500">
            {isEdit ? "New Password (Optional)" : "Security Password *"}
          </label>
          <input
            type="password"
            {...register("password")}
            placeholder={isEdit ? "Leave empty to keep current" : "••••••••"}
            className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all"
          />
          {errors.password && (
            <p className="text-[10px] text-red-500 font-semibold">{errors.password.message}</p>
          )}
        </div>

        {/* System Role */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-slate-500">
            System Access Role <span className="text-red-500">*</span>
          </label>
          <select
            {...register("role")}
            className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2.5 text-slate-800 dark:text-white outline-none focus:border-amber-500 transition-all"
          >
            <option value="USER">USER (Data Entry / View)</option>
            <option value="ADMIN">ADMIN (Full Access)</option>
          </select>
        </div>
      </div>

      {/* Staff Permissions section */}
      {selectedRole === "USER" && (
        <div className="space-y-3 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/35">
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Staff Permissions</h4>
          <p className="text-[10px] text-slate-450 dark:text-slate-500 mb-2">
            Configure granular access permissions for this USER account.
          </p>

          <div className="space-y-4">
            {permissionGroups.map((group) => (
              <div key={group.name} className="space-y-1.5">
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
                  {group.name}
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {group.permissions.map((p) => {
                    const isChecked = selectedPermissions.includes(p.id);
                    return (
                      <label
                        key={p.id}
                        className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setValue(
                                "permissions",
                                selectedPermissions.filter((x) => x !== p.id)
                              );
                            } else {
                              setValue("permissions", [...selectedPermissions, p.id]);
                            }
                          }}
                          className="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500/20 accent-amber-500"
                        />
                        <span className="text-[11px] text-slate-700 dark:text-slate-350 font-medium">
                          {p.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Account Status */}
      {isEdit && (
        <div className="flex items-center gap-2.5 py-1">
          <input
            type="checkbox"
            id="staff-isActive"
            {...register("isActive")}
            className="h-4.5 w-4.5 rounded border-slate-300 text-amber-500 focus:ring-amber-500/20 accent-amber-500"
          />
          <label
            htmlFor="staff-isActive"
            className="text-xs font-semibold text-slate-700 dark:text-slate-350 cursor-pointer"
          >
            Staff user account is active
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
          disabled={saveUserMutation.isPending}
          className="rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 text-white px-4 py-2.5 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
        >
          {saveUserMutation.isPending && (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          )}
          <span>{isEdit ? "Save Changes" : "Register Staff"}</span>
        </button>
      </div>
    </form>
  );
}
