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
            // Always preserve token.id if it exists
            if (user) {
                token.id = user.id;
                token.role = ((user as { role?: "USER" | "ADMIN" }).role ?? "USER") as "USER" | "ADMIN";
                token.placementTestCompleted = (user as { placementTestCompleted?: boolean }).placementTestCompleted || false;
                token.cefrLevel = (user as { cefrLevel?: string | null }).cefrLevel || null;
                token.language = (user as { language?: string }).language || "en";
                token.theme = (user as { theme?: string }).theme || "light";
            } else if (!token.id && token.email) {
                // Fallback: If token.id is missing but we have email, fetch user from DB
                try {
                    const dbUser = await prisma.user.findUnique({
                        where: { email: token.email as string },
                        select: { id: true, role: true, placementTestCompleted: true, cefrLevel: true, language: true, theme: true }
                    });
                    if (dbUser) {
                        token.id = dbUser.id;
                        token.role = dbUser.role;
                        token.placementTestCompleted = dbUser.placementTestCompleted || false;
                        token.cefrLevel = dbUser.cefrLevel;
                        token.language = dbUser.language || "en";
                        token.theme = dbUser.theme || "light";
                    }
                } catch (error) {
                    console.error("[JWT] Error fetching user:", error);
                }
            }
            // Store provider info for first-time login
            if (account) {
                token.provider = account.provider;
            }
            // Refresh token data on update
            if (trigger === "update" && token.id) {
                const updatedUser = await prisma.user.findUnique({
                    where: { id: token.id as string },
                    select: {
                        placementTestCompleted: true,
                        cefrLevel: true,
                        role: true,
                        language: true,
                        theme: true
                    }
                });
                if (updatedUser) {
                    token.placementTestCompleted = updatedUser.placementTestCompleted;
                    token.cefrLevel = updatedUser.cefrLevel;
                    token.role = updatedUser.role;
                    token.language = updatedUser.language || "en";
                    token.theme = updatedUser.theme || "light";
                }
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                // Ensure token.id exists, if not try to get from email
                if (!token.id && session.user.email) {
                    try {
                        const dbUser = await prisma.user.findUnique({
                            where: { email: session.user.email },
                            select: { id: true }
                        });
                        if (dbUser) {
                            token.id = dbUser.id;
                        }
                    } catch (error) {
                        console.error("[Session] Error fetching user ID:", error);
                    }
                }
                
                if (token.id) {
                    session.user.id = token.id as string;
                } else {
                    console.warn("[Session] No user ID in token, session may be invalid");
                }
                
                session.user.role = (token.role as "USER" | "ADMIN") || "USER";
                (session.user as { placementTestCompleted?: boolean }).placementTestCompleted = token.placementTestCompleted || false;
                (session.user as { cefrLevel?: string | null }).cefrLevel = token.cefrLevel || null;
                (session.user as { language?: string }).language = (token.language as string) || "en";
                (session.user as { theme?: string }).theme = (token.theme as string) || "light";
            }
            return session;
        },
        async signIn() {
            // Always allow sign-in, database operations handled by Prisma Adapter
            return true;
        },
    },
};

