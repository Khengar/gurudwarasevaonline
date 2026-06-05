import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionTrustId } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const trustId = await getSessionTrustId(req);

    // 1. Total Receipt Collections (This Month)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const receiptSum = await prisma.receipt.aggregate({
      where: {
        trustId,
        date: { gte: startOfMonth },
      },
      _sum: {
        amount: true,
      },
    });
    const totalReceipts = receiptSum._sum.amount ? Number(receiptSum._sum.amount) : 0;

    // 2. Room Occupancy
    const totalRooms = await prisma.room.count({
      where: { trustId },
    });
    const activeBookings = await prisma.roomBooking.findMany({
      where: {
        trustId,
        bookingStatus: "CHECKED_IN",
      },
      select: {
        roomId: true,
      },
    });
    const occupiedRoomsCount = new Set(activeBookings.map((b) => b.roomId)).size;
    const occupancyRate = totalRooms > 0 ? Math.round((occupiedRoomsCount / totalRooms) * 100) : 0;

    // 3. Active Yatris
    const activeGuestsCount = await prisma.roomBooking.count({
      where: {
        trustId,
        bookingStatus: "CHECKED_IN",
      },
    });

    // Today's Check-ins
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const todayCheckIns = await prisma.roomBooking.count({
      where: {
        trustId,
        bookingStatus: "CHECKED_IN",
        checkIn: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });

    // 4. Pending Dues
    const duesSum = await prisma.roomBooking.aggregate({
      where: {
        trustId,
        bookingStatus: {
          in: ["CONFIRMED", "CHECKED_IN"],
        },
      },
      _sum: {
        balanceDue: true,
      },
    });
    const pendingDues = duesSum._sum.balanceDue ? Number(duesSum._sum.balanceDue) : 0;
    const awaitingCheckoutCount = await prisma.roomBooking.count({
      where: {
        trustId,
        bookingStatus: "CHECKED_IN",
      },
    });

    // 5. Recent Bookings (5 most recent)
    const recentBookings = await prisma.roomBooking.findMany({
      where: { trustId },
      take: 5,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        room: {
          select: {
            roomNumber: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        totalReceipts,
        occupancyRate,
        occupiedRoomsCount,
        totalRooms,
        activeGuestsCount,
        todayCheckIns,
        pendingDues,
        awaitingCheckoutCount,
        recentBookings,
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { success: false, error: err.message || "Failed to calculate dashboard statistics." },
      { status: 500 }
    );
  }
}
