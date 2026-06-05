import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionTrustId, getSessionUserId } from "@/lib/session";
import { BookingStatus, BookingPaymentStatus, PaymentType } from "@prisma/client";

export async function GET(req: Request) {
  try {
    const trustId = await getSessionTrustId(req);

    const bookings = await prisma.roomBooking.findMany({
      where: {
        trustId,
      },
      include: {
        room: true,
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ success: true, data: bookings });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch bookings" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      roomId,
      guestName,
      mobileNumber,
      email,
      address,
      idProofType,
      idProofNo,
      checkIn,
      checkOut,
      adults,
      children,
      totalNights,
      ratePerNight,
      totalAmount,
      advancePaid,
      balanceDue,
      paymentStatus,
      paymentType,
      notes,
    } = body;

    const trustId = await getSessionTrustId(req);
    const userId = await getSessionUserId();

    // Validation
    if (
      !roomId ||
      !guestName ||
      !mobileNumber ||
      !checkIn ||
      !checkOut ||
      !totalNights ||
      !ratePerNight ||
      !totalAmount
    ) {
      return NextResponse.json(
        { success: false, error: "Missing required fields." },
        { status: 400 }
      );
    }

    // Verify room exists and belongs to this trust
    const roomExists = await prisma.room.findFirst({
      where: {
        id: roomId,
        trustId,
      },
    });

    if (!roomExists) {
      return NextResponse.json(
        { success: false, error: "Room not found or does not belong to this trust." },
        { status: 404 }
      );
    }

    // Check for overlapping bookings
    const overlappingBooking = await prisma.roomBooking.findFirst({
      where: {
        roomId,
        bookingStatus: { in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] },
        OR: [
          {
            checkIn: { lt: new Date(checkOut) },
            checkOut: { gt: new Date(checkIn) },
          },
        ],
      },
    });

    if (overlappingBooking) {
      return NextResponse.json(
        { success: false, error: "This room is already booked for the selected dates." },
        { status: 409 }
      );
    }

    // Auto-generate sequential booking number: BKG-[YEAR]-[INCREMENT]
    const currentYear = new Date(checkIn).getFullYear();
    const prefix = `BKG-${currentYear}-`;

    const lastBooking = await prisma.roomBooking.findFirst({
      where: {
        trustId,
        bookingNo: {
          startsWith: prefix,
        },
      },
      orderBy: {
        bookingNo: "desc",
      },
    });

    let nextIncrement = 1;
    if (lastBooking) {
      const parts = lastBooking.bookingNo.split("-");
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) {
        nextIncrement = lastSeq + 1;
      }
    }

    const bookingNo = `${prefix}${String(nextIncrement).padStart(4, "0")}`;

    const newBooking = await prisma.roomBooking.create({
      data: {
        trustId,
        bookingNo,
        roomId,
        guestName,
        mobileNumber,
        email: email || null,
        address: address || null,
        idProofType: idProofType || null,
        idProofNo: idProofNo || null,
        checkIn: new Date(checkIn),
        checkOut: new Date(checkOut),
        adults: typeof adults === "number" ? adults : 1,
        children: typeof children === "number" ? children : 0,
        totalNights: parseInt(totalNights, 10),
        ratePerNight: parseFloat(ratePerNight),
        totalAmount: parseFloat(totalAmount),
        advancePaid: parseFloat(advancePaid || 0),
        balanceDue: parseFloat(balanceDue || 0),
        paymentStatus: (paymentStatus || BookingPaymentStatus.PENDING) as BookingPaymentStatus,
        paymentType: paymentType ? (paymentType as PaymentType) : null,
        bookingStatus: BookingStatus.CONFIRMED,
        notes: notes || null,
        createdById: userId,
      },
      include: {
        room: true,
      },
    });

    return NextResponse.json({ success: true, data: newBooking }, { status: 201 });
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err.code === "P2002") {
      return NextResponse.json(
        { success: false, error: "A booking with this number already exists." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, error: err.message || "Failed to create booking" },
      { status: 500 }
    );
  }
}
