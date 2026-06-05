import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionTrustId, checkPermission } from "@/lib/session";
import { RoomType, RoomStatus, Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

interface RouteParams {
  params: {
    id: string;
  };
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!checkPermission(session, "ROOM_UPDATE")) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You do not have permission to update rooms." },
        { status: 403 }
      );
    }

    const id = params.id;
    const body = await req.json();
    const { roomNumber, name, type, capacity, ratePerDay, description, amenities, floor, status } = body;
    const trustId = await getSessionTrustId(req);

    const updateData: Prisma.RoomUpdateInput = {};
    if (roomNumber !== undefined) updateData.roomNumber = roomNumber;
    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type as RoomType;
    if (capacity !== undefined) updateData.capacity = parseInt(capacity, 10);
    if (ratePerDay !== undefined) updateData.ratePerDay = parseFloat(ratePerDay);
    if (description !== undefined) updateData.description = description || null;
    if (amenities !== undefined) {
      updateData.amenities = amenities ? (amenities as Prisma.InputJsonValue) : Prisma.DbNull;
    }
    if (floor !== undefined) updateData.floor = floor || null;
    if (status !== undefined) updateData.status = status as RoomStatus;

    const updatedRoom = await prisma.room.update({
      where: {
        id,
        trustId,
      },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: updatedRoom });
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err.code === "P2025") {
      return NextResponse.json(
        { success: false, error: "Room not found or access denied." },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { success: false, error: err.message || "Failed to update room" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!checkPermission(session, "ROOM_DELETE")) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You do not have permission to delete rooms." },
        { status: 403 }
      );
    }

    const id = params.id;
    const trustId = await getSessionTrustId(req);

    const deletedRoom = await prisma.room.delete({
      where: {
        id,
        trustId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Room deleted successfully.",
      data: deletedRoom,
    });
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err.code === "P2025") {
      return NextResponse.json(
        { success: false, error: "Room not found or access denied." },
        { status: 404 }
      );
    }
    // Foreign key constraint violation (Prisma P2003)
    if (err.code === "P2003") {
      return NextResponse.json(
        {
          success: false,
          error: "This room cannot be deleted because it contains active or past reservations. Set status to INACTIVE instead.",
        },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, error: err.message || "Failed to delete room" },
      { status: 500 }
    );
  }
}
