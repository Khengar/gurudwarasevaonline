import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionTrustId } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const headIdParam = searchParams.get("headId");
    const trustId = await getSessionTrustId();

    const categories = await prisma.category.findMany({
      where: {
        trustId,
        isActive: true,
        ...(headIdParam ? { headId: headIdParam } : {}),
      },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ success: true, data: categories });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch categories";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { headId, name, namePunjabi, sortOrder, isActive } = body;
    const trustId = await getSessionTrustId();

    if (!headId || !name) {
      return NextResponse.json(
        { success: false, error: "Head ID and name are required fields." },
        { status: 400 }
      );
    }

    // Verify category head ownership and existence
    const parentHead = await prisma.categoryHead.findFirst({
      where: {
        id: headId,
        trustId,
      },
    });

    if (!parentHead) {
      return NextResponse.json(
        { success: false, error: "Parent category head not found or access denied." },
        { status: 404 }
      );
    }

    const newCategory = await prisma.category.create({
      data: {
        headId,
        trustId,
        name,
        namePunjabi: namePunjabi || null,
        sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
        isActive: isActive !== false,
      },
    });

    return NextResponse.json({ success: true, data: newCategory }, { status: 201 });
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    // Check for unique constraint violation
    if (err.code === "P2002") {
      return NextResponse.json(
        { success: false, error: "A category with this name already exists under this category head." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: err.message || "Failed to create category" },
      { status: 500 }
    );
  }
}
