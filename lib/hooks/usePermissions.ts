import { useSession } from "next-auth/react";
import { useCallback } from "react";

export function usePermissions() {
  const { data: session } = useSession();

  const hasPermission = useCallback((permission: string): boolean => {
    const role = session?.user?.role;
    if (role === "SUPERADMIN" || role === "ADMIN") {
      return true;
    }
    if (role === "USER") {
      return session?.user?.permissions?.includes(permission) || false;
    }
    return false;
  }, [session]);

  return {
    hasPermission,
    permissions: session?.user?.permissions || [],
    role: session?.user?.role || "",
    isAdmin: session?.user?.role === "ADMIN" || session?.user?.role === "SUPERADMIN",
  };
}
