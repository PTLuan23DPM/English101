import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Check if UserNotification model is available
function createPrismaClient() {
  const client = new PrismaClient({
    log: ["error", "warn"],
  });
  
  // Verify UserNotification model exists
  if (!client.userNotification) {
    console.error(
      "⚠️  Prisma Client missing UserNotification model. " +
      "Please run: npx prisma generate"
    );
  }
  
  return client;
}

const prismaClient =
    globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prismaClient;

export const prisma = prismaClient;
export default prismaClient;