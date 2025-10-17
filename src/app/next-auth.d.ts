import { DefaultSession } from "next-auth";

declare module "next-auth" {
    // Thuộc tính user trong session có thêm id & role
    interface Session {
        user: {
            id: string;
            role: "USER" | "ADMIN";
        } & DefaultSession["user"];
    }

    // Kiểu User đọc từ adapter (DB) có thêm role
    interface User {
        id: string;
        role: "USER" | "ADMIN";
    }
}
