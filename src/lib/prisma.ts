import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const prismaClient =
    globalForPrisma.prisma ||
    new PrismaClient({
        log: ["error", "warn"],
    });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prismaClient;

export const prisma = prismaClient;
export default prismaClient;