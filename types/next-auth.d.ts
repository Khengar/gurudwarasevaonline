import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    role: string;
    trustId: string | null;
    permissions: string[];
  }

  interface Session {
    user: {
      id: string;
      role: string;
      trustId: string | null;
      permissions: string[];
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    trustId: string | null;
    permissions: string[];
  }
}
