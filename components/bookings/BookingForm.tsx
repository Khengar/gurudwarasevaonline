"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { parseISO, differenceInDays, isValid } from "date-fns";
import { Loader2, Calendar, AlertCircle } from "lucide-react";
import { useDashboardStore } from "@/lib/store/useDashboardStore";

interface Room {
  id: string;
  roomNumber: string;
  name: string;
  type: string;
  capacity: number;
  ratePerDay: string; // Decimal serialized as string
  status: string;
}

interface BookingFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

// Zod Schema with Date and Math calculations
const bookingFormSchema = z
  .object({
    roomId: z.string().min(1, "Please select a room"),
    guestName: z.string().min(2, "Guest name must be at least 2 characters"),
    mobileNumber: z.string().min(10, "Mobile number must be at least 10 digits"),
    email: z.string().email("Invalid email address").optional().or(z.literal("")),
    address: z.string().optional().or(z.literal("")),
    idProofType: z.string().optional().or(z.literal("")),
    idProofNo: z.string().optional().or(z.literal("")),
    checkIn: z.string().min(1, "Check-in date is required"),
    checkOut: z.string().min(1, "Check-out date is required"),
    adults: z.string().refine((val) => {
      const num = parseInt(val, 10);
      return !isNaN(num) && num > 0;
    }, "At least 1 adult occupant is required"),
    children: z.string(),
    totalNights: z.number().min(1, "Check-out date must be at least 1 night after check-in"),
    ratePerNight: z.number(),
    totalAmount: z.number(),
    advancePaid: z
      .string()
      .refine((val) => {
        const num = parseFloat(val);
        return !isNaN(num) && num >= 0;
      }, "Advance paid must be a non-negative number"),
    balanceDue: z.number(),
    paymentStatus: z.enum(["PENDING", "PARTIAL", "PAID"]),
    paymentType: z.string().optional().or(z.literal("")),
    notes: z.string().optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    const checkInDate = parseISO(data.checkIn);
    const checkOutDate = parseISO(data.checkOut);

    if (isValid(checkInDate) && isValid(checkOutDate)) {
      if (checkOutDate <= checkInDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Check-out date must be after check-in date",
          path: ["checkOut"],
        });
      }
    }
  });

type BookingFormValues = z.infer<typeof bookingFormSchema>;

export default function BookingForm({ onSuccess, onCancel }: BookingFormProps) {
  const queryClient = useQueryClient();
  const { currentTrust } = useDashboardStore();
  const todayStr = new Date().toISOString().split("T")[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      roomId: "",
      guestName: "",
      mobileNumber: "",
      email: "",
      address: "",
      idProofType: "Aadhaar",
      idProofNo: "",
      checkIn: todayStr,
      checkOut: tomorrowStr,
      adults: "1",
      children: "0",
      totalNights: 1,
      ratePerNight: 0,
      totalAmount: 0,
      advancePaid: "0",
      balanceDue: 0,
      paymentStatus: "PENDING",
      paymentType: "CASH",
      notes: "",
    },
  });

  // Fetch rooms list
  const { data: rooms = [], isLoading: isLoadingRooms } = useQuery<Room[]>({
    queryKey: ["rooms", currentTrust?.id],
    queryFn: async () => {
      const res = await fetch(`/api/rooms?trustId=${currentTrust?.id}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to load rooms");
      return json.data;
    },
  });

  // Fetch active bookings to cross-reference room availability by date
  const { data: activeBookings = [] } = useQuery<{
    roomId: string;
    checkIn: string;
    checkOut: string;
    bookingStatus: string;
  }[]>({
    queryKey: ["bookings-active", currentTrust?.id],
    queryFn: async () => {
      const res = await fetch(`/api/bookings?trustId=${currentTrust?.id}`);
      const json = await res.json();
      if (!json.success) return [];
      return json.data.filter((b: { bookingStatus: string }) =>
        ["CONFIRMED", "CHECKED_IN"].includes(b.bookingStatus)
      );
    },
  });

  // Watch form fields for math calculations
  const watchedRoomId = watch("roomId");
  const watchedCheckIn = watch("checkIn");
  const watchedCheckOut = watch("checkOut");

  const watchedAdvancePaid = watch("advancePaid");

  // Perform auto-calculations
  useEffect(() => {
    const selectedRoom = rooms.find((r) => r.id === watchedRoomId);
    const checkInDate = parseISO(watchedCheckIn);
    const checkOutDate = parseISO(watchedCheckOut);

    let nights = 0;
    if (isValid(checkInDate) && isValid(checkOutDate) && checkOutDate > checkInDate) {
      nights = differenceInDays(checkOutDate, checkInDate);
    }
    setValue("totalNights", nights);

    const rate = selectedRoom ? parseFloat(selectedRoom.ratePerDay) : 0;
    setValue("ratePerNight", rate);

    const total = nights * rate;
    setValue("totalAmount", total);

    const advance = parseFloat(watchedAdvancePaid || "0") || 0;
    const balance = total - advance;
    setValue("balanceDue", Math.max(0, balance));

    // Update payment status dynamically if paid fully or partially
    if (advance >= total && total > 0) {
      setValue("paymentStatus", "PAID");
    } else if (advance > 0 && advance < total) {
      setValue("paymentStatus", "PARTIAL");
    } else {
      setValue("paymentStatus", "PENDING");
    }
  }, [watchedRoomId, watchedCheckIn, watchedCheckOut, watchedAdvancePaid, rooms, setValue]);

  // Compute which rooms are available for the selected date range
  const availableRooms = React.useMemo(() => {
    const checkInDate = parseISO(watchedCheckIn);
    const checkOutDate = parseISO(watchedCheckOut);
    const datesValid = isValid(checkInDate) && isValid(checkOutDate) && checkOutDate > checkInDate;

    return rooms.filter((room) => {
      // If dates are not selected yet, show only AVAILABLE-status rooms
      if (!datesValid) return room.status === "AVAILABLE";

      // Check if this room has any confirmed/checked-in booking overlapping the selected range
      const isBooked = activeBookings.some((booking) => {
        if (booking.roomId !== room.id) return false;
        const bCheckIn = new Date(booking.checkIn);
        const bCheckOut = new Date(booking.checkOut);
        // Overlap: booking starts before our checkout AND booking ends after our check-in
        return bCheckIn < checkOutDate && bCheckOut > checkInDate;
      });

      return !isBooked;
    });
  }, [rooms, activeBookings, watchedCheckIn, watchedCheckOut]);

  // Mutation to save reservation
  const createBookingMutation = useMutation({
    mutationFn: async (values: BookingFormValues) => {
      const res = await fetch(`/api/bookings?trustId=${currentTrust?.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to create booking");
      return json.data;
    },
    onSuccess: () => {
      // Invalidate all related queries to sync statuses
      queryClient.invalidateQueries({ queryKey: ["bookings", currentTrust?.id] });
      queryClient.invalidateQueries({ queryKey: ["bookings-active", currentTrust?.id] });
      queryClient.invalidateQueries({ queryKey: ["rooms", currentTrust?.id] });
      onSuccess();
    },
  });

  const onSubmit = (values: BookingFormValues) => {
    createBookingMutation.mutate(values);
  };


  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-xs font-semibold">
      {createBookingMutation.isError && (
        <div className="flex items-center gap-2 p-3 rounded-xl border border-red-200 bg-red-50 text-red-655">
          <AlertCircle className="h-4.5 w-4.5 shrink-0" />
          <span className="text-[11px] font-medium">
            {createBookingMutation.error.message}
          </span>
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500">
            Guest Name / Lead Yatri <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            {...register("guestName")}
            placeholder="e.g. Sardar Gurmukh Singh"
            className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-slate-800 dark:text-white outline-none focus:border-amber-500 transition-all"
          />
          {errors.guestName && (
            <p className="text-[10px] text-red-500 font-semibold">{errors.guestName.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500">
            Mobile Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            {...register("mobileNumber")}
            placeholder="e.g. 9876543210"
            className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-slate-800 dark:text-white outline-none focus:border-amber-500 transition-all"
          />
          {errors.mobileNumber && (
            <p className="text-[10px] text-red-500 font-semibold">{errors.mobileNumber.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500">
            Email Address
          </label>
          <input
            type="email"
            {...register("email")}
            placeholder="e.g. gurmukh@yatri.com"
            className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-slate-800 dark:text-white outline-none focus:border-amber-500 transition-all"
          />
          {errors.email && (
            <p className="text-[10px] text-red-500 font-semibold">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500">
            Home Address / City
          </label>
          <input
            type="text"
            {...register("address")}
            placeholder="e.g. Ludhiana, Punjab"
            className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-slate-800 dark:text-white outline-none focus:border-amber-500 transition-all"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500">
            Identity Proof Type
          </label>
          <select
            {...register("idProofType")}
            className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2.5 text-slate-800 dark:text-white outline-none focus:border-amber-500 transition-all"
          >
            <option value="Aadhaar">Aadhaar Card</option>
            <option value="PAN">PAN Card</option>
            <option value="Passport">Passport</option>
            <option value="Voter ID">Voter ID Card</option>
            <option value="Driving License">Driving License</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500">
            ID Proof Number
          </label>
          <input
            type="text"
            {...register("idProofNo")}
            placeholder="Identity Document Number"
            className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-slate-800 dark:text-white outline-none focus:border-amber-500 transition-all"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-slate-500 flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            <span>Check-In Date <span className="text-red-500">*</span></span>
          </label>
          <input
            type="date"
            {...register("checkIn")}
            className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-slate-800 dark:text-white outline-none focus:border-amber-500 transition-all"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-slate-500 flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            <span>Check-Out Date <span className="text-red-500">*</span></span>
          </label>
          <input
            type="date"
            {...register("checkOut")}
            className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-slate-800 dark:text-white outline-none focus:border-amber-500 transition-all"
          />
          {errors.checkOut && (
            <p className="text-[10px] text-red-500 font-semibold">{errors.checkOut.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500">
            Adult Occupants <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            {...register("adults")}
            className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-slate-800 dark:text-white outline-none focus:border-amber-500 transition-all"
          />
          {errors.adults && (
            <p className="text-[10px] text-red-500 font-semibold">{errors.adults.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500">
            Children (Aged 5-12)
          </label>
          <input
            type="number"
            {...register("children")}
            className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-slate-800 dark:text-white outline-none focus:border-amber-500 transition-all"
          />
        </div>
      </div>

      {/* Conditional Room Selection Dropdown */}
      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-slate-500 flex justify-between items-center">
          <span>Select Room (Available Rooms Only) <span className="text-red-500">*</span></span>
          {(!watchedCheckIn || !watchedCheckOut) && (
            <span className="text-[9px] text-amber-500 lowercase normal-case italic">Select dates to filter correctly</span>
          )}
        </label>
        <select
          {...register("roomId")}
          className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2.5 text-slate-800 dark:text-white outline-none focus:border-amber-500 transition-all"
        >
          <option value="">-- Select Room --</option>
          {isLoadingRooms ? (
            <option disabled>Loading rooms database...</option>
          ) : availableRooms.length === 0 ? (
            <option disabled>No rooms available for selected dates</option>
          ) : (
            availableRooms.map((room) => (
              <option key={room.id} value={room.id}>
                Room {room.roomNumber} - {room.name} ({room.type}) - ₹
                {parseFloat(room.ratePerDay).toFixed(0)}/night
              </option>
            ))
          )}
        </select>
        {errors.roomId && (
          <p className="text-[10px] text-red-500 font-semibold">{errors.roomId.message}</p>
        )}
      </div>

      {/* Financial Calculations Box (Grid) */}
      <div className="p-4 rounded-2xl bg-amber-550/5 border border-amber-550/10 grid grid-cols-2 sm:grid-cols-4 gap-4 transition-all">
        <div className="flex flex-col">
          <span className="text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Total Nights
          </span>
          <span className="text-sm font-bold text-slate-800 dark:text-white mt-1">
            {watch("totalNights")} {watch("totalNights") === 1 ? "Night" : "Nights"}
          </span>
        </div>

        <div className="flex flex-col">
          <span className="text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Rate per Night
          </span>
          <span className="text-sm font-bold text-slate-800 dark:text-white mt-1">
            ₹{watch("ratePerNight")}
          </span>
        </div>

        <div className="flex flex-col">
          <span className="text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Total Room Seva
          </span>
          <span className="text-sm font-bold text-slate-800 dark:text-white mt-1">
            ₹{watch("totalAmount")}
          </span>
        </div>

        <div className="flex flex-col">
          <span className="text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-550">
            Balance Due
          </span>
          <span className="text-sm font-bold text-amber-600 dark:text-amber-400 mt-1">
            ₹{watch("balanceDue")}
          </span>
        </div>
      </div>

      {/* Advance Paid & Payment Type */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500">
            Advance Seva Paid (INR)
          </label>
          <input
            type="number"
            step="0.01"
            {...register("advancePaid")}
            placeholder="0.00"
            className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-slate-800 dark:text-white outline-none focus:border-amber-500 transition-all"
          />
          {errors.advancePaid && (
            <p className="text-[10px] text-red-500 font-semibold">{errors.advancePaid.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500">
            Advance Method
          </label>
          <select
            {...register("paymentType")}
            className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2.5 text-slate-800 dark:text-white outline-none focus:border-amber-500 transition-all"
          >
            <option value="CASH">CASH</option>
            <option value="UPI">UPI</option>
            <option value="ONLINE">ONLINE TRANSFER</option>
            <option value="CHEQUE">CHEQUE</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500">
            Payment Status
          </label>
          <select
            {...register("paymentStatus")}
            disabled
            className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 px-3 py-2.5 text-slate-850 dark:text-slate-350 outline-none cursor-not-allowed"
          >
            <option value="PENDING">PENDING</option>
            <option value="PARTIAL">PARTIAL</option>
            <option value="PAID">PAID</option>
          </select>
        </div>
      </div>

      {/* Booking Notes */}
      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-slate-500">
          Voucher Notes / Special requests
        </label>
        <textarea
          {...register("notes")}
          rows={3}
          placeholder="Special notes (e.g. senior citizen lodging, ground floor preference)"
          className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-slate-800 dark:text-white outline-none focus:border-amber-500 transition-all resize-none"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-550/10 px-4 py-2.5 text-xs font-bold transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={createBookingMutation.isPending}
          className="rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 text-white px-4 py-2.5 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
        >
          {createBookingMutation.isPending && (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          )}
          <span>Book Lodging</span>
        </button>
      </div>
    </form>
  );
}
