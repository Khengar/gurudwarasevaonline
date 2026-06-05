import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionTrustId, getSessionUserId } from "@/lib/session";
import { PaymentType } from "@prisma/client";

export async function GET(req: Request) {
  try {
    const trustId = await getSessionTrustId(req);

    const payments = await prisma.payment.findMany({
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

    return NextResponse.json({ success: true, data: payments });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch payments" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      payeeName,
      mobileNumber,
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
    const userId = await getSessionUserId();

    // Validation
    if (!payeeName || !amount || !paymentType || !categoryId || !date) {
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

    // Auto-generate sequential payment number: PAY-[YEAR]-[INCREMENT]
    const currentYear = new Date(date).getFullYear();
    const prefix = `PAY-${currentYear}-`;

    const lastPayment = await prisma.payment.findFirst({
      where: {
        trustId,
        paymentNo: {
          startsWith: prefix,
        },
      },
      orderBy: {
        paymentNo: "desc",
      },
    });

    let nextIncrement = 1;
    if (lastPayment) {
      const parts = lastPayment.paymentNo.split("-");
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) {
        nextIncrement = lastSeq + 1;
      }
    }

    const paymentNo = `${prefix}${String(nextIncrement).padStart(4, "0")}`;

    const newPayment = await prisma.payment.create({
      data: {
        trustId,
        paymentNo,
        payeeName,
        mobileNumber: mobileNumber || null,
        amount: parsedAmount,
        paymentType: paymentType as PaymentType,
        chequeNo: paymentType === "CHEQUE" ? chequeNo : null,
        bankName: paymentType === "CHEQUE" ? bankName : null,
        transactionId: ["UPI", "ONLINE", "NEFT", "RTGS"].includes(paymentType) ? transactionId : null,
        categoryId,
        notes: notes || null,
        date: new Date(date),
        createdById: userId,
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json({ success: true, data: newPayment }, { status: 201 });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { success: false, error: err.message || "Failed to create payment record" },
      { status: 500 }
    );
  }
}
