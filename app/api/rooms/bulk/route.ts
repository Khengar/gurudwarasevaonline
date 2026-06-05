import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionTrustId } from "@/lib/session";
import { RoomType, RoomStatus } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { startNumber, endNumber, type, capacity, ratePerDay, floor, amenities } = body;
    const trustId = await getSessionTrustId(req);

    // 1. Validation
    if (startNumber === undefined || endNumber === undefined || !type || ratePerDay === undefined || capacity === undefined) {
      return NextResponse.json(
        { success: false, error: "Missing required fields." },
        { status: 400 }
      );
    }

    const start = parseInt(startNumber, 10);
    const end = parseInt(endNumber, 10);

    if (isNaN(start) || start <= 0 || isNaN(end) || end <= 0) {
      return NextResponse.json(
        { success: false, error: "Start and end numbers must be positive integers." },
        { status: 400 }
      );
    }

    if (end < start) {
      return NextResponse.json(
        { success: false, error: "End room number must be greater than or equal to start room number." },
        { status: 400 }
      );
    }

    // Limit bulk generation to 100 rooms per request to prevent timeouts
    const totalRooms = end - start + 1;
    if (totalRooms > 100) {
      return NextResponse.json(
        { success: false, error: "You can create a maximum of 100 rooms in a single bulk operation." },
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

    // 2. Generate room list data
    const roomsData = [];
    for (let i = start; i <= end; i++) {
      roomsData.push({
        trustId,
        roomNumber: String(i),
        name: `Room ${i}`,
        type: type as RoomType,
        capacity: parsedCapacity,
        ratePerDay: parsedRate,
        description: `Bulk generated room ${i}`,
        amenities: amenities || null,
        floor: floor || null,
        status: RoomStatus.AVAILABLE,
      });
    }

    // 3. Batch Create using createMany with skipDuplicates: true
    const result = await prisma.room.createMany({
      data: roomsData,
      skipDuplicates: true,
    });

    if (result.count === 0) {
      return NextResponse.json(
        { success: false, error: "No rooms were created. Ensure room numbers do not already exist." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: `Successfully created ${result.count} out of ${totalRooms} requested rooms.`,
        data: result,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { success: false, error: err.message || "Failed to bulk create rooms." },
      { status: 500 }
    );
  }
}
