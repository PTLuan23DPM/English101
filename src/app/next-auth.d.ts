import { DefaultSession } from "next-auth";

declare module "next-auth" {
    // Extend session user with id, role and learning flags
    interface Session {
        user: {
            id: string;
            role: "USER" | "ADMIN";
            placementTestCompleted: boolean;
            cefrLevel: string | null;
        } & DefaultSession["user"];
    }

    // Extend database user mapped by the adapter
    interface User {
        id: string;
        role: "USER" | "ADMIN";
        placementTestCompleted?: boolean;
        cefrLevel?: string | null;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string;
        role: "USER" | "ADMIN";
        placementTestCompleted: boolean;
        cefrLevel: string | null;
        provider?: string;
    }
}
