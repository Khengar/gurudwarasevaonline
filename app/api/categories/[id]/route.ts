import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionTrustId, checkPermission } from "@/lib/session";
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
    if (!checkPermission(session, "CATEGORY_UPDATE")) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You do not have permission to update categories." },
        { status: 403 }
      );
    }

    const id = params.id;
    const body = await req.json();
    const { name, namePunjabi, sortOrder, isActive } = body;
    const trustId = await getSessionTrustId(req);

    // Verify ownership and update
    const updatedCategory = await prisma.category.update({
      where: {
        id,
        trustId,
      },
      data: {
        ...(name !== undefined && { name }),
        ...(namePunjabi !== undefined && { namePunjabi }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({ success: true, data: updatedCategory });
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err.code === "P2025") {
      return NextResponse.json(
        { success: false, error: "Category not found or access denied." },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { success: false, error: err.message || "Failed to update category" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!checkPermission(session, "CATEGORY_DELETE")) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You do not have permission to delete categories." },
        { status: 403 }
      );
    }

    const id = params.id;
    const trustId = await getSessionTrustId(req);

    // Soft delete: set isActive to false
    const softDeletedCategory = await prisma.category.update({
      where: {
        id,
        trustId,
      },
      data: {
        isActive: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Category soft-deleted successfully.",
      data: softDeletedCategory,
    });
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err.code === "P2025") {
      return NextResponse.json(
        { success: false, error: "Category not found or access denied." },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { success: false, error: err.message || "Failed to delete category" },
      { status: 500 }
    );
  }
}
