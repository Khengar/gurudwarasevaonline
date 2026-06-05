import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkPermission } from "@/lib/session";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.trustId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: No active trust context." },
        { status: 401 }
      );
    }

    const trust = await prisma.trust.findUnique({
      where: { id: session.user.trustId },
    });

    if (!trust) {
      return NextResponse.json(
        { success: false, error: "Trust details not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: trust });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { success: false, error: err.message || "Failed to retrieve trust settings." },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.trustId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: No active trust context." },
        { status: 401 }
      );
    }

    if (!checkPermission(session, "SETTINGS_UPDATE")) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You do not have permission to update settings." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, address, city, state, phone, email } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Trust Name is a required field." },
        { status: 400 }
      );
    }

    const updatedTrust = await prisma.trust.update({
      where: { id: session.user.trustId },
      data: {
        name,
        address: address || null,
        city: city || null,
        state: state || null,
        phone: phone || null,
        email: email || null,
      },
    });

    return NextResponse.json({ success: true, data: updatedTrust });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { success: false, error: err.message || "Failed to update settings." },
      { status: 500 }
    );
  }
}
