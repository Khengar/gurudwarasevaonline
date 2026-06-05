import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getSessionTrustId(req?: Request): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error("Unauthorized: No active session found.");
  }

  let requestedTrustId: string | null = null;
  if (req) {
    const url = new URL(req.url);
    requestedTrustId = url.searchParams.get("trustId") || req.headers.get("x-trust-id");
  }

  const sessionTrustId = session.user.trustId;

  if (session.user.role === "SUPERADMIN") {
    const trustId = requestedTrustId || sessionTrustId;
    if (!trustId) {
      const { prisma } = await import("./prisma");
      const firstTrust = await prisma.trust.findFirst();
      if (!firstTrust) {
        throw new Error("Access Denied: No trust records exist in the system.");
      }
      return firstTrust.id;
    }
    return trustId;
  }

  if (!sessionTrustId) {
    throw new Error("Unauthorized: User has no assigned Gurudwara (Trust) context.");
  }

  if (requestedTrustId && requestedTrustId !== sessionTrustId) {
    throw new Error("Forbidden: You do not have permission to access this Gurudwara (Trust).");
  }

  return sessionTrustId;
}

export async function getSessionUserId(): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Unauthorized: No user session found.");
  }
  return session.user.id;
}

import { Session } from "next-auth";

export function checkPermission(session: Session | null, requiredPermission: string): boolean {
  if (!session || !session.user) return false;
  if (session.user.role === "ADMIN" || session.user.role === "SUPERADMIN") return true;
  if (session.user.role === "USER") {
    return session.user.permissions?.includes(requiredPermission) || false;
  }
  return false;
}
