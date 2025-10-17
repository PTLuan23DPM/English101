import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";


export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma),
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
    ],
    session: { strategy: "database" },
    pages: { signIn: "/authentication/login" },
    debug: process.env.NODE_ENV === "development",
    callbacks: {
        async signIn({ user }) {
            const u = user as { id: string; role?: "USER" | "ADMIN" };
            if (!u.role) await prisma.user.update({ where: { id: u.id }, data: { role: "USER" } });
            return true;
        },
        async session({ session, user }) {
            const u = user as { id: string; role?: "USER" | "ADMIN" };
            if (session.user) {
                // đã augment next-auth types → không cần any
                session.user.id = u.id;
                session.user.role = (u.role ?? "USER") as "USER" | "ADMIN";
            }
            return session;
        },
    },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
