import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

function generateLicenseKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const part1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `GSO-${part1}-${part2}`;
}

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPERADMIN") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Only Platform Superadmins can perform this action." },
        { status: 403 }
      );
    }

    // Generate a unique license key
    let licenseKey = "";
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      licenseKey = generateLicenseKey();
      const existing = await prisma.license.findUnique({
        where: { licenseKey },
      });
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      throw new Error("Failed to generate a unique license key. Please try again.");
    }

    // Default expiration: 1 year from now
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    const license = await prisma.license.create({
      data: {
        licenseKey,
        expiresAt,
        status: "ACTIVE",
      },
    });

    return NextResponse.json({ success: true, data: license }, { status: 201 });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { success: false, error: err.message || "Failed to generate license key." },
      { status: 500 }
    );
  }
}
