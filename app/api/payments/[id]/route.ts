import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkPermission, getSessionTrustId } from "@/lib/session";
import { PaymentType } from "@prisma/client";

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const trustId = await getSessionTrustId(req);
    const payment = await prisma.payment.findFirst({
      where: { id: params.id, trustId },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            namePunjabi: true,
            head: { select: { id: true, name: true } },
          },
        },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!payment) {
      return NextResponse.json(
        { success: false, error: "Payment not found or access denied." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: payment });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch payment" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!checkPermission(session, "PAYMENT_UPDATE")) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You do not have permission to update payments." },
        { status: 403 }
      );
    }

    const trustId = await getSessionTrustId(req);
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

    const parsedAmount = parseFloat(amount);
    if (!isNaN(parsedAmount) && parsedAmount <= 0) {
      return NextResponse.json(
        { success: false, error: "Amount must be a positive decimal." },
        { status: 400 }
      );
    }

    const updatedPayment = await prisma.payment.update({
      where: { id: params.id, trustId },
      data: {
        ...(payeeName && { payeeName }),
        ...(mobileNumber !== undefined && { mobileNumber: mobileNumber || null }),
        ...(amount && !isNaN(parsedAmount) && { amount: parsedAmount }),
        ...(paymentType && { paymentType: paymentType as PaymentType }),
        ...(chequeNo !== undefined && { chequeNo: paymentType === "CHEQUE" ? chequeNo : null }),
        ...(bankName !== undefined && { bankName: paymentType === "CHEQUE" ? bankName : null }),
        ...(transactionId !== undefined && {
          transactionId: ["UPI", "ONLINE", "NEFT", "RTGS"].includes(paymentType)
            ? transactionId
            : null,
        }),
        ...(categoryId && { categoryId }),
        ...(notes !== undefined && { notes: notes || null }),
        ...(date && { date: new Date(date) }),
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            head: { select: { id: true, name: true } },
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: updatedPayment });
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err.code === "P2025") {
      return NextResponse.json(
        { success: false, error: "Payment not found or access denied." },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { success: false, error: err.message || "Failed to update payment" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!checkPermission(session, "PAYMENT_DELETE")) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You do not have permission to delete payments." },
        { status: 403 }
      );
    }

    const trustId = await getSessionTrustId(req);

    const deleted = await prisma.payment.delete({
      where: { id: params.id, trustId },
    });

    return NextResponse.json({
      success: true,
      message: "Payment deleted successfully.",
      data: deleted,
    });
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err.code === "P2025") {
      return NextResponse.json(
        { success: false, error: "Payment not found or access denied." },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { success: false, error: err.message || "Failed to delete payment" },
      { status: 500 }
    );
  }
}
