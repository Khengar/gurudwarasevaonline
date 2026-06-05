"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, AlertCircle, Lock, Mail, Sparkles } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginValues) => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email: values.email,
        password: values.password,
      });

      if (result?.error) {
        setErrorMsg(result.error);
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setErrorMsg("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 py-12 transition-colors duration-300">
      {/* Decorative Golden Gradients */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-gradient-to-tr from-amber-500/10 to-orange-500/10 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[400px] h-[400px] bg-gradient-to-br from-yellow-500/10 to-amber-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Login Card */}
      <div className="relative w-full max-w-md bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-3xl p-8 md:p-10 backdrop-blur-md">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white shadow-md shadow-orange-500/20 mb-4">
            <Sparkles className="h-6 w-6 animate-pulse" />
          </div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-wider">
            GurSewa Online
          </h1>
          <p className="text-xs text-slate-450 dark:text-slate-500 mt-1 uppercase font-bold tracking-widest">
            ਸੇਵਾ ਸਿਮਰਨ ਦਫਤਰ • Login Portal
          </p>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="flex items-center gap-2 p-3.5 rounded-2xl border border-red-200 bg-red-50 text-red-700 text-xs font-semibold mb-6">
            <AlertCircle className="h-4.5 w-4.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-xs font-semibold">
          {/* Email field */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
              <Mail className="h-3 w-3" />
              <span>Email Address</span>
            </label>
            <input
              type="email"
              {...register("email")}
              placeholder="admin@gursewa.online"
              className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-slate-850 dark:text-white placeholder-slate-400 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all"
            />
            {errors.email && (
              <p className="text-[10px] text-red-500 font-semibold mt-1">{errors.email.message}</p>
            )}
          </div>

          {/* Password field */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
              <Lock className="h-3 w-3" />
              <span>Password</span>
            </label>
            <input
              type="password"
              {...register("password")}
              placeholder="••••••••"
              className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-slate-850 dark:text-white placeholder-slate-400 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all"
            />
            {errors.password && (
              <p className="text-[10px] text-red-500 font-semibold mt-1">{errors.password.message}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white py-3 text-xs font-bold shadow-lg shadow-orange-500/20 transition-all active:scale-[0.98] mt-6"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <span>Sign In to System</span>
            )}
          </button>
        </form>

        {/* Footer info banner */}
        <p className="text-[10px] text-center text-slate-400 dark:text-slate-500 mt-8 font-medium">
          Authorized personnel only. Donations & ledger assets are subject to security auditing.
        </p>
      </div>
    </div>
  );
}
