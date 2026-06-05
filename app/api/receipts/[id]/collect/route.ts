import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionTrustId } from "@/lib/session";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPERADMIN"].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: "Unauthorized. Only admins can collect receipts." }, { status: 403 });
    }

    const trustId = await getSessionTrustId(req);
    const receiptId = params.id;

    // Verify receipt exists and belongs to the trust
    const receipt = await prisma.receipt.findFirst({
      where: {
        id: receiptId,
        trustId,
      },
    });

    if (!receipt) {
      return NextResponse.json({ success: false, error: "Receipt not found or access denied." }, { status: 404 });
    }

    if (receipt.isCollected) {
      return NextResponse.json({ success: false, error: "Receipt is already collected." }, { status: 400 });
    }

    const updatedReceipt = await prisma.receipt.update({
      where: { id: receiptId },
      data: {
        isCollected: true,
        collectedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, data: updatedReceipt });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { success: false, error: err.message || "Failed to collect receipt" },
      { status: 500 }
    );
  }
}
