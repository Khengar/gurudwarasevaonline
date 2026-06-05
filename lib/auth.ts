import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing email or password.");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.isActive) {
          throw new Error("User account is inactive or does not exist.");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isPasswordValid) {
          throw new Error("Invalid email or password.");
        }

        // Validate organization license status for non-SUPERADMIN accounts
        if (user.role !== "SUPERADMIN") {
          if (!user.trustId) {
            throw new Error("Access Denied: User is not associated with any organization.");
          }

          const trust = await prisma.trust.findUnique({
            where: { id: user.trustId },
            include: { license: true },
          });

          if (!trust || !trust.isActive) {
            throw new Error("Access Denied: Your organization's license is inactive or expired. Please contact support.");
          }

          if (
            trust.license.status !== "ACTIVE" ||
            (trust.license.expiresAt && new Date() > new Date(trust.license.expiresAt))
          ) {
            throw new Error("Access Denied: Your organization's license is inactive or expired. Please contact support.");
          }
        }

        const permissions: string[] = Array.isArray(user.permissions)
          ? (user.permissions as string[])
          : [];

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          trustId: user.trustId,
          permissions,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.trustId = user.trustId;
        token.permissions = user.permissions;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.trustId = token.trustId as string;
        session.user.permissions = (token.permissions as string[]) || [];
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET || "gurshed-secret-token-key-string",
};
