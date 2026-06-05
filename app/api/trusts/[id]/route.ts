import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPERADMIN") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Only Platform Superadmins can access this resource." },
        { status: 403 }
      );
    }

    const id = params.id;
    const body = await req.json();
    const { name, city, isActive } = body;

    // Verify trust exists
    const trust = await prisma.trust.findUnique({
      where: { id },
    });

    if (!trust) {
      return NextResponse.json(
        { success: false, error: "Gurudwara (Trust) not found." },
        { status: 404 }
      );
    }

    // Prepare update parameters
    const updateData: {
      name?: string;
      city?: string | null;
      isActive?: boolean;
    } = {};

    if (name !== undefined) updateData.name = name;
    if (city !== undefined) updateData.city = city || null;
    if (isActive !== undefined) updateData.isActive = !!isActive;

    const updatedTrust = await prisma.trust.update({
      where: { id },
      data: updateData,
      include: {
        license: true,
      },
    });

    return NextResponse.json({ success: true, data: updatedTrust });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { success: false, error: err.message || "Failed to update trust." },
      { status: 500 }
    );
  }
}
