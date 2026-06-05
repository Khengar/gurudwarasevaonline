import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionTrustId } from "@/lib/session";
import { RoomType, RoomStatus } from "@prisma/client";

export async function GET(req: Request) {
  try {
    const trustId = await getSessionTrustId(req);

    const rooms = await prisma.room.findMany({
      where: {
        trustId,
      },
      orderBy: {
        roomNumber: "asc",
      },
    });

    return NextResponse.json({ success: true, data: rooms });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch rooms" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { roomNumber, name, type, capacity, ratePerDay, description, amenities, floor } = body;
    const trustId = await getSessionTrustId(req);

    // Validation
    if (!roomNumber || !name || !type || !ratePerDay) {
      return NextResponse.json(
        { success: false, error: "Missing required fields." },
        { status: 400 }
      );
    }

    const parsedRate = parseFloat(ratePerDay);
    if (isNaN(parsedRate) || parsedRate < 0) {
      return NextResponse.json(
        { success: false, error: "Rate per day must be a non-negative number." },
        { status: 400 }
      );
    }

    const parsedCapacity = parseInt(capacity, 10);
    if (isNaN(parsedCapacity) || parsedCapacity <= 0) {
      return NextResponse.json(
        { success: false, error: "Capacity must be a positive integer." },
        { status: 400 }
      );
    }

    const newRoom = await prisma.room.create({
      data: {
        trustId,
        roomNumber,
        name,
        type: type as RoomType,
        capacity: parsedCapacity,
        ratePerDay: parsedRate,
        description: description || null,
        amenities: amenities ? amenities : null,
        floor: floor || null,
        status: RoomStatus.AVAILABLE,
      },
    });

    return NextResponse.json({ success: true, data: newRoom }, { status: 201 });
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err.code === "P2002") {
      return NextResponse.json(
        { success: false, error: "A room with this number already exists in this Gurudwara." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, error: err.message || "Failed to create room" },
      { status: 500 }
    );
  }
}
