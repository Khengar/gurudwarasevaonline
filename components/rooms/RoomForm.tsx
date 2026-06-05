"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, AlertCircle } from "lucide-react";

interface RoomFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const roomFormSchema = z.object({
  roomNumber: z.string().min(1, "Room number is required"),
  name: z.string().min(2, "Room label / name must be at least 2 characters"),
  type: z.enum(["SINGLE", "DOUBLE", "DORMITORY", "FAMILY", "SUITE", "VIP"]),
  capacity: z.string().refine((val) => {
    const num = parseInt(val, 10);
    return !isNaN(num) && num > 0;
  }, "Capacity must be a positive integer"),
  ratePerDay: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0;
  }, "Rate per day must be a non-negative number"),
  floor: z.string().optional().or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
});

type RoomFormValues = z.infer<typeof roomFormSchema>;

const AMENITIES_OPTIONS = [
  "AC",
  "Hot Water",
  "TV",
  "Attached Washroom",
  "Wifi",
  "Extra Bedding",
];

export default function RoomForm({ onSuccess, onCancel }: RoomFormProps) {
  const queryClient = useQueryClient();
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RoomFormValues>({
    resolver: zodResolver(roomFormSchema),
    defaultValues: {
      roomNumber: "",
      name: "",
      type: "DOUBLE",
      capacity: "2",
      ratePerDay: "350",
      floor: "",
      description: "",
    },
  });

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity)
        ? prev.filter((a) => a !== amenity)
        : [...prev, amenity]
    );
  };

  // Mutation to create a room
  const createRoomMutation = useMutation({
    mutationFn: async (values: RoomFormValues) => {
      const payload = {
        ...values,
        amenities: selectedAmenities,
      };

      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to create room");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      onSuccess();
    },
  });

  const onSubmit = (values: RoomFormValues) => {
    createRoomMutation.mutate(values);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-xs font-semibold">
      {createRoomMutation.isError && (
        <div className="flex items-center gap-2 p-3 rounded-xl border border-red-200 bg-red-50 text-red-650">
          <AlertCircle className="h-4.5 w-4.5 shrink-0" />
          <span className="text-[11px] font-medium">
            {createRoomMutation.error.message}
          </span>
        </div>
      )}

      {/* Room Number & Label Name */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500">
            Room Number / Code <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            {...register("roomNumber")}
            placeholder="e.g. 101"
            className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all"
          />
          {errors.roomNumber && (
            <p className="text-[10px] text-red-500 font-semibold">{errors.roomNumber.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500">
            Room Label Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            {...register("name")}
            placeholder="e.g. Deluxe Double Bed"
            className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all"
          />
          {errors.name && (
            <p className="text-[10px] text-red-500 font-semibold">{errors.name.message}</p>
          )}
        </div>
      </div>

      {/* Room Type & Floor */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500">
            Room Lodging Type <span className="text-red-500">*</span>
          </label>
          <select
            {...register("type")}
            className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2.5 text-slate-800 dark:text-white outline-none focus:border-amber-500 transition-all"
          >
            <option value="SINGLE">SINGLE ROOM</option>
            <option value="DOUBLE">DOUBLE ROOM</option>
            <option value="DORMITORY">DORMITORY</option>
            <option value="FAMILY">FAMILY ROOM</option>
            <option value="SUITE">SUITE</option>
            <option value="VIP">VIP SUITE</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500">
            Floor Location / Wing
          </label>
          <input
            type="text"
            {...register("floor")}
            placeholder="e.g. Ground Floor, West Wing"
            className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all"
          />
        </div>
      </div>

      {/* Capacity & Rate per Day */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-slate-500">
            Guest Capacity (Max occupants) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            {...register("capacity")}
            placeholder="2"
            className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-slate-800 dark:text-white outline-none focus:border-amber-500 transition-all"
          />
          {errors.capacity && (
            <p className="text-[10px] text-red-500 font-semibold">{errors.capacity.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-slate-500">
            Seva Rate per Day (INR) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            {...register("ratePerDay")}
            placeholder="350"
            className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-slate-800 dark:text-white outline-none focus:border-amber-500 transition-all"
          />
          {errors.ratePerDay && (
            <p className="text-[10px] text-red-500 font-semibold">{errors.ratePerDay.message}</p>
          )}
        </div>
      </div>

      {/* Room Amenities Checklist */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500">
          Room Amenities / Features
        </label>
        <div className="grid grid-cols-2 gap-2 p-3 border border-slate-100 dark:border-slate-800 rounded-xl">
          {AMENITIES_OPTIONS.map((amenity) => {
            const isChecked = selectedAmenities.includes(amenity);
            return (
              <label
                key={amenity}
                className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 dark:text-slate-350 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleAmenity(amenity)}
                  className="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500/20 accent-amber-500"
                />
                <span>{amenity}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Room description */}
      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500">
          Description / Additional Notes
        </label>
        <textarea
          {...register("description")}
          rows={3}
          placeholder="Details like bed configuration, view, washroom info, etc."
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
          disabled={createRoomMutation.isPending}
          className="rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 text-white px-4 py-2.5 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
        >
          {createRoomMutation.isPending && (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          )}
          <span>Create Room</span>
        </button>
      </div>
    </form>
  );
}
