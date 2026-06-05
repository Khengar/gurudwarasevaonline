"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, Settings, AlertCircle, CheckCircle2, Plus, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";

const settingsSchema = z.object({
  name: z.string().min(2, "Gurudwara / Trust Name must be at least 2 characters"),
  address: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  state: z.string().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  email: z.string().email("Please enter a valid email address").optional().or(z.literal("")),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [isSubTrustModalOpen, setIsSubTrustModalOpen] = useState(false);

  const subTrustSchema = z.object({
    name: z.string().min(2, "Sub-trust name must be at least 2 characters"),
    city: z.string().optional().or(z.literal("")),
  });

  type SubTrustFormValues = z.infer<typeof subTrustSchema>;

  interface SubTrustRecord {
    id: string;
    name: string;
    city: string | null;
  }

  // Fetch all trusts for this user's license
  const { data: trustsData = [], isLoading: isLoadingTrusts } = useQuery<SubTrustRecord[]>({
    queryKey: ["trusts"],
    queryFn: async () => {
      const res = await fetch("/api/trusts");
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to load trusts");
      return json.data;
    },
    enabled: session?.user?.role === "ADMIN",
  });

  const {
    register: registerSubTrust,
    handleSubmit: handleSubmitSubTrust,
    reset: resetSubTrust,
    formState: { errors: subTrustErrors },
  } = useForm<SubTrustFormValues>({
    resolver: zodResolver(subTrustSchema),
    defaultValues: {
      name: "",
      city: "",
    },
  });

  const createSubTrustMutation = useMutation({
    mutationFn: async (values: SubTrustFormValues) => {
      const res = await fetch("/api/trusts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to create sub-trust");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trusts"] });
      setIsSubTrustModalOpen(false);
      resetSubTrust();
    },
  });

  const onSubTrustSubmit = (values: SubTrustFormValues) => {
    createSubTrustMutation.mutate(values);
  };

  // Fetch current settings
  const { data: settings, isLoading, isError, error } = useQuery({
    queryKey: ["trustSettings"],
    queryFn: async () => {
      const res = await fetch("/api/settings");
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to load settings");
      return json.data;
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isDirty },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: "",
      address: "",
      city: "",
      state: "",
      phone: "",
      email: "",
    },
  });

  // Populate form when data is fetched
  useEffect(() => {
    if (settings) {
      setValue("name", settings.name || "");
      setValue("address", settings.address || "");
      setValue("city", settings.city || "");
      setValue("state", settings.state || "");
      setValue("phone", settings.phone || "");
      setValue("email", settings.email || "");
    }
  }, [settings, setValue]);

  // Mutation to update settings
  const updateSettingsMutation = useMutation({
    mutationFn: async (values: SettingsFormValues) => {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to save settings");
      return json.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["trustSettings"], data);
      queryClient.invalidateQueries({ queryKey: ["trustSettings"] });
    },
  });

  const onSubmit = (values: SettingsFormValues) => {
    updateSettingsMutation.mutate(values);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
        <p className="text-xs text-slate-455 font-medium animate-pulse">Loading Gurudwara configuration...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-center">
        <AlertCircle className="h-10 w-10 mx-auto mb-3 text-red-500" />
        <h3 className="text-sm font-bold">Failed to load configuration</h3>
        <p className="text-xs mt-1">{(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-6 max-w-4xl text-xs font-semibold">
      {/* Page Header */}
      <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-200">
        <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
          <Settings className="h-5.5 w-5.5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white uppercase tracking-wider">
            Gurudwara Settings
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-450 mt-0.5">
            Configure contact parameters, official address, and details printed on seva receipt documents.
          </p>
        </div>
      </div>

      {/* Main Settings Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors duration-200">
        <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Organization Details</h3>
          <p className="text-[11px] text-slate-450 dark:text-slate-500">
            Fill in the correct contact and location variables. These are used in PDF vouchers dynamically.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 md:p-8 space-y-6">
          {updateSettingsMutation.isSuccess && (
            <div className="flex items-center gap-2 p-3.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-705 dark:bg-emerald-950/20 dark:border-emerald-900/50 dark:text-emerald-400">
              <CheckCircle2 className="h-4.5 w-4.5 shrink-0" />
              <span className="text-[11px] font-medium">
                Settings updated successfully. PDF receipts will now reflect these details.
              </span>
            </div>
          )}

          {updateSettingsMutation.isError && (
            <div className="flex items-center gap-2 p-3.5 rounded-xl border border-red-200 bg-red-50 text-red-650 dark:bg-red-950/20 dark:border-red-900/50 dark:text-red-400">
              <AlertCircle className="h-4.5 w-4.5 shrink-0" />
              <span className="text-[11px] font-medium">
                {updateSettingsMutation.error.message}
              </span>
            </div>
          )}

          <div className="grid gap-6 sm:grid-cols-2">
            {/* Gurudwara Name */}
            <div className="sm:col-span-2 space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500">
                Gurudwara / Trust Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register("name")}
                className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all"
                placeholder="e.g. Sri Harmandir Sahib"
              />
              {errors.name && (
                <p className="text-[10px] text-red-500 font-semibold">{errors.name.message}</p>
              )}
            </div>

            {/* Address */}
            <div className="sm:col-span-2 space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-slate-500">
                Address
              </label>
              <input
                type="text"
                {...register("address")}
                className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all"
                placeholder="e.g. Golden Temple Road"
              />
              {errors.address && (
                <p className="text-[10px] text-red-500 font-semibold">{errors.address.message}</p>
              )}
            </div>

            {/* City */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-slate-500">
                City
              </label>
              <input
                type="text"
                {...register("city")}
                className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all"
                placeholder="e.g. Amritsar"
              />
              {errors.city && (
                <p className="text-[10px] text-red-500 font-semibold">{errors.city.message}</p>
              )}
            </div>

            {/* State */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-slate-500">
                State
              </label>
              <input
                type="text"
                {...register("state")}
                className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all"
                placeholder="e.g. Punjab"
              />
              {errors.state && (
                <p className="text-[10px] text-red-500 font-semibold">{errors.state.message}</p>
              )}
            </div>

            {/* Contact Number */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-slate-500">
                Contact Phone
              </label>
              <input
                type="text"
                {...register("phone")}
                className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all"
                placeholder="e.g. +91 183 2553957"
              />
              {errors.phone && (
                <p className="text-[10px] text-red-500 font-semibold">{errors.phone.message}</p>
              )}
            </div>

            {/* Email Address */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-slate-500">
                Official Email
              </label>
              <input
                type="text"
                {...register("email")}
                className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all"
                placeholder="e.g. info@goldentemple.org"
              />
              {errors.email && (
                <p className="text-[10px] text-red-500 font-semibold">{errors.email.message}</p>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-2.5 pt-5 border-t border-slate-100 dark:border-slate-800/80">
            <button
              type="submit"
              disabled={updateSettingsMutation.isPending || !isDirty}
              className="rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-slate-250 dark:disabled:bg-slate-800 text-white disabled:text-slate-450 dark:disabled:text-slate-500 px-5 py-2.5 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-[0.98]"
            >
              {updateSettingsMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>Save Settings Changes</span>
            </button>
          </div>
        </form>
      </div>

      {/* Sub-Trusts Section for ADMIN only */}
      {session?.user?.role === "ADMIN" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors duration-200">
          <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Gurudwara Sub-Trusts & Branches</h3>
              <p className="text-[11px] text-slate-450 dark:text-slate-550">
                Manage branch locations and sub-trusts registered under your organization&apos;s license.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsSubTrustModalOpen(true)}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white px-4 py-2 text-xs font-bold shadow-md shadow-orange-950/10 transition-all active:scale-[0.98] self-start sm:self-center"
            >
              <Plus className="h-4 w-4" />
              <span>Add Sub-Trust</span>
            </button>
          </div>

          <div className="p-6 md:p-8">
            {isLoadingTrusts ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 text-amber-500 animate-spin" />
              </div>
            ) : trustsData && trustsData.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {trustsData.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-slate-150 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/50"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-slate-800 dark:text-slate-200">{t.name}</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{t.city || "No location set"}</span>
                    </div>
                    {session?.user && t.id === session.user.trustId && (
                      <span className="rounded-full bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400 px-2.5 py-0.5 text-[9px] font-bold">
                        Primary
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-slate-400 dark:text-slate-550 py-4 font-medium">No sub-trusts found.</p>
            )}
          </div>
        </div>
      )}

      {/* ─── ADD SUB-TRUST MODAL ──────────────────────────────── */}
      <AnimatePresence>
        {isSubTrustModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSubTrustModalOpen(false)}
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
                onClick={() => setIsSubTrustModalOpen(false)}
                className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-650 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-4.5 w-4.5" />
              </button>

              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                Create Sub-Trust
              </h3>
              <p className="text-xs text-slate-450 dark:text-slate-550 mb-6">
                Register a new branch or sub-trust location under your organization&apos;s license.
              </p>

              <form onSubmit={handleSubmitSubTrust(onSubTrustSubmit)} className="space-y-4">
                {createSubTrustMutation.isError && (
                  <div className="flex items-center gap-2 p-3 border border-red-200 bg-red-50 text-red-650 dark:bg-red-950/20 dark:border-red-900/50 dark:text-red-400 rounded-xl">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span className="text-[10px] font-semibold">{createSubTrustMutation.error.message}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-slate-500">
                    Sub-Trust / Branch Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...registerSubTrust("name")}
                    className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-slate-800 dark:text-white outline-none focus:border-amber-500 transition-all"
                    placeholder="e.g. Sri Harmandir Sahib - Branch B"
                  />
                  {subTrustErrors.name && (
                    <p className="text-[10px] text-red-500 font-semibold">{subTrustErrors.name.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-slate-500">
                    City / Location
                  </label>
                  <input
                    type="text"
                    {...registerSubTrust("city")}
                    className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-slate-800 dark:text-white outline-none focus:border-amber-500 transition-all"
                    placeholder="e.g. Jalandhar"
                  />
                  {subTrustErrors.city && (
                    <p className="text-[10px] text-red-500 font-semibold">{subTrustErrors.city.message}</p>
                  )}
                </div>

                <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsSubTrustModalOpen(false)}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 px-4 py-2.5 text-xs font-bold transition-all text-slate-700 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createSubTrustMutation.isPending}
                    className="rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white px-5 py-2.5 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-[0.98]"
                  >
                    {createSubTrustMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <span>Create Sub-Trust</span>
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
