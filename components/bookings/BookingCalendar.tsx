"use client";

import React, { useMemo, useState } from "react";
import { Calendar, dateFnsLocalizer, Views, View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale/en-US";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Loader2 } from "lucide-react";

// Setup date-fns localizer for react-big-calendar
const locales = {
  "en-US": enUS,
};
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface Booking {
  id: string;
  bookingNo: string;
  roomId: string;
  room: {
    id: string;
    roomNumber: string;
    name: string;
    type: string;
  };
  guestName: string;
  mobileNumber: string;
  email: string | null;
  address: string | null;
  idProofType: string | null;
  idProofNo: string | null;
  checkIn: string;
  checkOut: string;
  totalNights: number;
  totalAmount: string;
  advancePaid: string;
  balanceDue: string;
  paymentStatus: "PENDING" | "PARTIAL" | "PAID";
  bookingStatus: "CONFIRMED" | "CHECKED_IN" | "CHECKED_OUT" | "CANCELLED" | "NO_SHOW";
  notes: string | null;
}

interface BookingCalendarProps {
  bookings: Booking[];
  isLoading: boolean;
}

export default function BookingCalendar({ bookings, isLoading }: BookingCalendarProps) {
  const [view, setView] = useState<View>(Views.MONTH);
  const [date, setDate] = useState<Date>(new Date());

  // Map our booking objects to the Event object format expected by react-big-calendar
  const events = useMemo(() => {
    return bookings
      .filter((b) => b.bookingStatus !== "CANCELLED" && b.bookingStatus !== "NO_SHOW")
      .map((booking) => ({
        id: booking.id,
        title: `${booking.guestName} - Room ${booking.room.roomNumber}`,
        start: new Date(booking.checkIn),
        end: new Date(booking.checkOut),
        resource: booking,
      }));
  }, [bookings]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        <span className="text-xs font-semibold text-slate-500">Loading Calendar...</span>
      </div>
    );
  }

  // Custom event styling based on booking status
  const eventPropGetter = (event: unknown) => {
    const calendarEvent = event as { resource: Booking };
    const booking = calendarEvent.resource;
    let backgroundColor = "#f59e0b"; // Amber (Confirmed)
    if (booking.bookingStatus === "CHECKED_IN") backgroundColor = "#10b981"; // Emerald
    else if (booking.bookingStatus === "CHECKED_OUT") backgroundColor = "#64748b"; // Slate

    return {
      style: {
        backgroundColor,
        borderRadius: "8px",
        opacity: 0.9,
        color: "white",
        border: "0px",
        display: "block",
        fontSize: "11px",
        fontWeight: "600",
        padding: "2px 6px",
      },
    };
  };

  return (
    <div className="h-[600px] w-full p-4 bg-white dark:bg-slate-900 overflow-y-auto">
      <style>
        {`
          .rbc-calendar {
            font-family: inherit;
            color: inherit;
          }
          .rbc-header {
            padding: 8px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #64748b;
            border-bottom: 1px solid #f1f5f9;
          }
          .dark .rbc-header {
            border-bottom-color: #1e293b;
            color: #94a3b8;
          }
          .rbc-month-view, .rbc-time-view, .rbc-agenda-view {
            border-radius: 16px;
            border: 1px solid #f1f5f9;
            overflow: hidden;
            background: white;
          }
          .dark .rbc-month-view, .dark .rbc-time-view, .dark .rbc-agenda-view {
            border-color: #1e293b;
            background: #0f172a;
          }
          .rbc-day-bg + .rbc-day-bg, .rbc-month-row + .rbc-month-row {
            border-color: #f1f5f9;
          }
          .dark .rbc-day-bg + .rbc-day-bg, .dark .rbc-month-row + .rbc-month-row {
            border-color: #1e293b;
          }
          .rbc-today {
            background-color: #fffbeb !important;
          }
          .dark .rbc-today {
            background-color: #451a03 !important;
          }
          .rbc-event {
            transition: transform 0.1s ease;
          }
          .rbc-event:hover {
            transform: scale(1.02);
            z-index: 10;
          }
          .rbc-toolbar button {
            color: #475569;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 600;
          }
          .dark .rbc-toolbar button {
            color: #cbd5e1;
          }
          .rbc-toolbar button.rbc-active {
            background-color: #f59e0b;
            color: white;
            border-color: #f59e0b;
          }
          .dark .rbc-toolbar button.rbc-active {
            background-color: #ea580c;
            border-color: #ea580c;
          }
        `}
      </style>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: "100%" }}
        views={[Views.MONTH, Views.WEEK, Views.AGENDA]}
        view={view}
        date={date}
        onView={(newView) => setView(newView)}
        onNavigate={(newDate) => setDate(newDate)}
        eventPropGetter={eventPropGetter}
        tooltipAccessor={(e) => `${e.title}\nStatus: ${e.resource.bookingStatus}\nPaid: ${e.resource.paymentStatus}`}
      />
    </div>
  );
}
