import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const trustId = searchParams.get("trustId");

    if (!trustId) {
      return NextResponse.json({ success: false, error: "Trust ID is required" }, { status: 400 });
    }

    // Fetch latest 3 receipts
    const receipts = await prisma.receipt.findMany({
      where: { trustId },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: { category: true },
    });

    // Fetch latest 3 bookings
    const bookings = await prisma.roomBooking.findMany({
      where: { trustId },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: { room: true },
    });

    const notifications: any[] = [];

    receipts.forEach((r) => {
      notifications.push({
        id: `rcpt_${r.id}`,
        type: "RECEIPT",
        title: "New Receipt Generated",
        message: `Rs. ${Number(r.amount).toLocaleString("en-IN")} received from ${r.fullName} for ${r.category.name}.`,
        createdAt: r.createdAt,
      });
    });

    bookings.forEach((b) => {
      let title = "Room Booking Alert";
      let message = `Booking for ${b.guestName} in Room ${b.room.roomNumber}.`;
      if (b.bookingStatus === "CHECKED_IN") {
        title = "Yatri Checked In";
        message = `${b.guestName} checked into Room ${b.room.roomNumber}.`;
      } else if (b.bookingStatus === "CHECKED_OUT") {
        title = "Yatri Checked Out";
        message = `${b.guestName} checked out of Room ${b.room.roomNumber}.`;
      }

      notifications.push({
        id: `bk_${b.id}`,
        type: "BOOKING",
        title,
        message,
        createdAt: b.createdAt,
      });
    });

    // Sort by descending createdAt and take top 5
    notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return NextResponse.json({
      success: true,
      data: notifications.slice(0, 5),
    });
  } catch (error: any) {
    console.error("Notifications API Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
