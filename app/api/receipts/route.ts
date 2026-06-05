import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionTrustId } from "@/lib/session";
import { PaymentType } from "@prisma/client";

export async function GET(req: Request) {
  try {
    const trustId = await getSessionTrustId(req);

    const receipts = await prisma.receipt.findMany({
      where: {
        trustId,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            namePunjabi: true,
            head: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ success: true, data: receipts });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch receipts" },
      { status: 500 }
    );
  }
}

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    
    const body = await req.json();
    const {
      fullName,
      mobileNumber,
      address,
      amount,
      paymentType,
      chequeNo,
      bankName,
      transactionId,
      categoryId,
      notes,
      date,
    } = body;

    const trustId = await getSessionTrustId(req);
    const userId = session.user.id;

    // Validation
    if (!fullName || !amount || !paymentType || !categoryId || !date) {
      return NextResponse.json(
        { success: false, error: "Missing required fields." },
        { status: 400 }
      );
    }

    // Amount validation
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json(
        { success: false, error: "Amount must be a positive decimal." },
        { status: 400 }
      );
    }

    // Verify category exists and belongs to this trust
    const categoryExists = await prisma.category.findFirst({
      where: {
        id: categoryId,
        trustId,
      },
    });

    if (!categoryExists) {
      return NextResponse.json(
        { success: false, error: "Category not found or does not belong to this trust." },
        { status: 404 }
      );
    }

    // Auto-generate sequential receipt number: RCPT-[YEAR]-[INCREMENT]
    const currentYear = new Date(date).getFullYear();
    const prefix = `RCPT-${currentYear}-`;

    const lastReceipt = await prisma.receipt.findFirst({
      where: {
        trustId,
        receiptNo: {
          startsWith: prefix,
        },
      },
      orderBy: {
        receiptNo: "desc",
      },
    });

    let nextIncrement = 1;
    if (lastReceipt) {
      const parts = lastReceipt.receiptNo.split("-");
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) {
        nextIncrement = lastSeq + 1;
      }
    }

    const receiptNo = `${prefix}${String(nextIncrement).padStart(4, "0")}`;

    const newReceipt = await prisma.receipt.create({
      data: {
        trustId,
        receiptNo,
        fullName,
        mobileNumber: mobileNumber || null,
        address: address || null,
        amount: parsedAmount,
        paymentType: paymentType as PaymentType,
        chequeNo: paymentType === "CHEQUE" ? chequeNo : null,
        bankName: paymentType === "CHEQUE" ? bankName : null,
        transactionId: ["UPI", "ONLINE", "NEFT", "RTGS"].includes(paymentType) ? transactionId : null,
        categoryId,
        notes: notes || null,
        date: new Date(date),
        createdById: userId,
        isCollected: ["ADMIN", "SUPERADMIN"].includes(session.user.role),
        collectedAt: ["ADMIN", "SUPERADMIN"].includes(session.user.role) ? new Date() : null,
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json({ success: true, data: newReceipt }, { status: 201 });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { success: false, error: err.message || "Failed to create receipt" },
      { status: 500 }
    );
  }
}
