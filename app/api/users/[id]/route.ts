import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionTrustId } from "@/lib/session";
import bcrypt from "bcryptjs";
import { UserRole, Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Only Trust Admins can access this resource." },
        { status: 403 }
      );
    }

    const id = params.id;
    const body = await req.json();
    const { name, email, role, isActive, password, permissions } = body;
    const trustId = await getSessionTrustId(req);

    // Verify user exists and belongs to this trust
    const user = await prisma.user.findFirst({
      where: { id, trustId },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Staff member not found." },
        { status: 404 }
      );
    }

    const updateData: {
      name?: string;
      email?: string;
      role?: UserRole;
      isActive?: boolean;
      passwordHash?: string;
      permissions?: Prisma.InputJsonValue;
    } = {};
    if (name) updateData.name = name;
    if (email) {
      // Check if email taken by someone else
      const emailTaken = await prisma.user.findFirst({
        where: {
          email,
          id: { not: id },
        },
      });
      if (emailTaken) {
        return NextResponse.json(
          { success: false, error: "Email is already in use by another user." },
          { status: 409 }
        );
      }
      updateData.email = email;
    }
    if (role) {
      if (role !== "ADMIN" && role !== "USER") {
        return NextResponse.json(
          { success: false, error: "Invalid role. Must be ADMIN or USER." },
          { status: 400 }
        );
      }
      updateData.role = role as UserRole;
    }
    if (isActive !== undefined) {
      updateData.isActive = !!isActive;
    }
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }
    if (permissions !== undefined) {
      updateData.permissions = (role || user.role) === "USER" ? permissions : [];
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        permissions: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ success: true, data: updatedUser });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { success: false, error: err.message || "Failed to update staff member." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Only Trust Admins can access this resource." },
        { status: 403 }
      );
    }

    const id = params.id;
    if (session.user.id === id) {
      return NextResponse.json(
        { success: false, error: "You cannot delete your own account." },
        { status: 400 }
      );
    }

    const trustId = await getSessionTrustId(req);

    // Verify user exists
    const user = await prisma.user.findFirst({
      where: { id, trustId },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Staff member not found." },
        { status: 404 }
      );
    }

    try {
      // Try hard delete first
      await prisma.user.delete({
        where: { id },
      });
      return NextResponse.json({
        success: true,
        message: "Staff member deleted successfully.",
      });
    } catch {
      // Fallback: Soft delete if user has linked entries
      const deactivatedUser = await prisma.user.update({
        where: { id },
        data: { isActive: false },
        select: {
          id: true,
          name: true,
          isActive: true,
        },
      });
      return NextResponse.json({
        success: true,
        message: "Staff member has transaction histories. Deactivated account instead.",
        data: deactivatedUser,
      });
    }
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { success: false, error: err.message || "Failed to delete staff member." },
      { status: 500 }
    );
  }
}
