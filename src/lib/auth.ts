import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma),
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
        CredentialsProvider({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Invalid credentials");
                }

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email },
                });

                if (!user || !user.password) {
                    throw new Error("Invalid credentials");
                }

                const isPasswordValid = await bcrypt.compare(
                    credentials.password,
                    user.password
                );

                if (!isPasswordValid) {
                    throw new Error("Invalid credentials");
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                };
            },
        }),
    ],
  session: {
    strategy: "jwt" as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
    pages: {
        signIn: "/authentication/login",
        error: "/authentication/login",
    },
    secret: process.env.NEXTAUTH_SECRET,
    debug: process.env.NODE_ENV === "development",
    callbacks: {
        async redirect({ url, baseUrl }) {
            // Allows relative callback URLs
            if (url.startsWith("/")) return `${baseUrl}${url}`;
            // Allows callback URLs on the same origin
            else if (new URL(url).origin === baseUrl) return url;
            return baseUrl + "/english/dashboard";
        },
        async jwt({ token, user, account, trigger }) {
            if (user) {
                token.id = user.id;
                token.role = (user as any).role || "USER";
                token.placementTestCompleted = (user as any).placementTestCompleted || false;
                token.cefrLevel = (user as any).cefrLevel || null;
            }
            // Store provider info for first-time login
            if (account) {
                token.provider = account.provider;
            }
            // Refresh token data on update
            if (trigger === "update") {
                const updatedUser = await prisma.user.findUnique({
                    where: { id: token.id as string },
                    select: { placementTestCompleted: true, cefrLevel: true, role: true }
                });
                if (updatedUser) {
                    token.placementTestCompleted = updatedUser.placementTestCompleted;
                    token.cefrLevel = updatedUser.cefrLevel;
                    token.role = updatedUser.role;
                }
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.role = (token.role as "USER" | "ADMIN") || "USER";
                (session.user as any).placementTestCompleted = token.placementTestCompleted || false;
                (session.user as any).cefrLevel = token.cefrLevel || null;
            }
            return session;
        },
        async signIn({ user, account, profile }) {
            // Always allow sign-in, database operations handled by Prisma Adapter
            return true;
        },
    },
};

