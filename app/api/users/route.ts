import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionTrustId } from "@/lib/session";
import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Only Trust Admins can access this resource." },
        { status: 403 }
      );
    }

    const trustId = await getSessionTrustId();

    const users = await prisma.user.findMany({
      where: {
        trustId,
        role: {
          in: [UserRole.ADMIN, UserRole.USER],
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        permissions: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ success: true, data: users });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch staff members." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Only Trust Admins can access this resource." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, email, password, role, permissions } = body;
    const trustId = await getSessionTrustId(req);

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { success: false, error: "Missing required fields." },
        { status: 400 }
      );
    }

    if (role !== "ADMIN" && role !== "USER") {
      return NextResponse.json(
        { success: false, error: "Invalid staff role. Must be ADMIN or USER." },
        { status: 400 }
      );
    }

    // Check if email already taken
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "Email address is already registered." },
        { status: 409 }
      );
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        trustId,
        name,
        email,
        passwordHash: hashedPassword,
        role: role as UserRole,
        permissions: role === "USER" ? (permissions || []) : [],
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        permissions: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, data: newUser }, { status: 201 });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { success: false, error: err.message || "Failed to create staff member." },
      { status: 500 }
    );
  }
}
