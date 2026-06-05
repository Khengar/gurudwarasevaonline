import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { EntryType } from "@prisma/client";

import { getSessionTrustId } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const typeParam = searchParams.get("type");
    const trustId = await getSessionTrustId();

    const categoryHeads = await prisma.categoryHead.findMany({
      where: {
        trustId,
        isActive: true,
        ...(typeParam === "RECEIPT" || typeParam === "PAYMENT"
          ? { type: typeParam as EntryType }
          : {}),
      },
      include: {
        categories: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ success: true, data: categoryHeads });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch category heads";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, type, namePunjabi, sortOrder, isActive } = body;
    const trustId = await getSessionTrustId();

    if (!name || !type) {
      return NextResponse.json(
        { success: false, error: "Name and type are required fields." },
        { status: 400 }
      );
    }

    if (type !== "RECEIPT" && type !== "PAYMENT") {
      return NextResponse.json(
        { success: false, error: "Type must be either RECEIPT or PAYMENT." },
        { status: 400 }
      );
    }

    const newHead = await prisma.categoryHead.create({
      data: {
        trustId,
        type: type as EntryType,
        name,
        namePunjabi: namePunjabi || null,
        sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
        isActive: isActive !== false,
      },
    });

    return NextResponse.json({ success: true, data: newHead }, { status: 201 });
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    // Check for unique constraint violation
    if (err.code === "P2002") {
      return NextResponse.json(
        { success: false, error: "A category head with this name already exists for this trust." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: err.message || "Failed to create category head" },
      { status: 500 }
    );
  }
}
