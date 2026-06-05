import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionTrustId, checkPermission } from "@/lib/session";
import { BookingStatus, BookingPaymentStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

interface RouteParams {
  params: {
    id: string;
  };
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!checkPermission(session, "BOOKING_UPDATE")) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You do not have permission to update bookings." },
        { status: 403 }
      );
    }

    const id = params.id;
    const body = await req.json();
    const { bookingStatus, paymentStatus } = body;
    const trustId = await getSessionTrustId(req);

    const updateData: {
      bookingStatus?: BookingStatus;
      paymentStatus?: BookingPaymentStatus;
    } = {};
    if (bookingStatus !== undefined) updateData.bookingStatus = bookingStatus as BookingStatus;
    if (paymentStatus !== undefined) updateData.paymentStatus = paymentStatus as BookingPaymentStatus;

    const updatedBooking = await prisma.roomBooking.update({
      where: {
        id,
        trustId,
      },
      data: updateData,
      include: {
        room: true,
      },
    });

    return NextResponse.json({ success: true, data: updatedBooking });
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err.code === "P2025") {
      return NextResponse.json(
        { success: false, error: "Booking not found or access denied." },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { success: false, error: err.message || "Failed to update booking status" },
      { status: 500 }
    );
  }
}
