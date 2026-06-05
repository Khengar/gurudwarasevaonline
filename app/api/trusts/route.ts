import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Please sign in." },
        { status: 401 }
      );
    }

    if (session.user.role === "SUPERADMIN") {
      const trusts = await prisma.trust.findMany({
        include: {
          license: true,
          users: {
            where: { role: "ADMIN" },
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              isActive: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return NextResponse.json({ success: true, data: trusts });
    }

    const trustId = session.user.trustId;
    if (!trustId) {
      return NextResponse.json({ success: true, data: [] });
    }

    const userTrust = await prisma.trust.findUnique({
      where: { id: trustId },
    });

    if (!userTrust) {
      return NextResponse.json({ success: true, data: [] });
    }

    const trusts = await prisma.trust.findMany({
      where: { licenseId: userTrust.licenseId },
    });

    return NextResponse.json({ success: true, data: trusts });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch trusts." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Please sign in." },
        { status: 401 }
      );
    }

    if (session.user.role !== "SUPERADMIN" && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Only Platform Superadmins or Gurudwara Admins can perform this action." },
        { status: 403 }
      );
    }

    const body = await req.json();

    // ADMIN Sub-Trust creation flow
    if (session.user.role === "ADMIN") {
      const { name, city } = body;
      if (!name) {
        return NextResponse.json(
          { success: false, error: "Missing required fields: Trust name is mandatory." },
          { status: 400 }
        );
      }

      const sessionTrustId = session.user.trustId;
      if (!sessionTrustId) {
        return NextResponse.json(
          { success: false, error: "Unauthorized: User has no assigned Gurudwara (Trust) context." },
          { status: 400 }
        );
      }

      const userTrust = await prisma.trust.findUnique({
        where: { id: sessionTrustId },
      });

      if (!userTrust) {
        return NextResponse.json(
          { success: false, error: "Associated trust not found for user." },
          { status: 404 }
        );
      }

      const newTrust = await prisma.trust.create({
        data: {
          name,
          city: city || null,
          licenseId: userTrust.licenseId,
          isActive: true,
        },
      });

      return NextResponse.json({ success: true, data: newTrust }, { status: 201 });
    }

    // SUPERADMIN flow
    const { name, city, licenseId, adminName, adminEmail, adminPassword } = body;

    // Validate Trust details and admin provisioning details
    if (!name || !licenseId || !adminName || !adminEmail || !adminPassword) {
      return NextResponse.json(
        { success: false, error: "Missing required fields. Trust name, license, and admin credentials (name, email, password) are all mandatory." },
        { status: 400 }
      );
    }

    // Verify admin email is unique before attempting creation
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "An administrator account with this email address already exists." },
        { status: 409 }
      );
    }

    // Verify license exists and is not already linked to another trust
    const license = await prisma.license.findUnique({
      where: { id: licenseId },
      include: { trusts: true },
    });

    if (!license) {
      return NextResponse.json(
        { success: false, error: "The provided license key was not found." },
        { status: 404 }
      );
    }

    if (license.trusts && license.trusts.length > 0) {
      return NextResponse.json(
        { success: false, error: "This license key is already assigned to another Gurudwara (Trust)." },
        { status: 409 }
      );
    }

    // Hash admin password
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Create the Trust and initial Admin in a transaction
    const newTrust = await prisma.$transaction(async (tx) => {
      const trust = await tx.trust.create({
        data: {
          name,
          city: city || null,
          licenseId,
          isActive: true,
        },
      });

      await tx.user.create({
        data: {
          name: adminName,
          email: adminEmail,
          passwordHash: hashedPassword,
          role: "ADMIN",
          trustId: trust.id,
          isActive: true,
        },
      });

      return tx.trust.findUnique({
        where: { id: trust.id },
        include: {
          license: true,
          users: {
            where: { role: "ADMIN" },
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              isActive: true,
            },
          },
        },
      });
    });

    return NextResponse.json({ success: true, data: newTrust }, { status: 201 });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { success: false, error: err.message || "Failed to create trust." },
      { status: 500 }
    );
  }
}
