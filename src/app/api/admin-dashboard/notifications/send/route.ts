import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { handleError } from "@/lib/error-handler";

// POST: Gửi thông báo tới người dùng
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const admin = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true },
    });

    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { userIds, title, message, type, link } = body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: "User IDs are required" },
        { status: 400 }
      );
    }

    if (!title || !message) {
      return NextResponse.json(
        { error: "Title and message are required" },
        { status: 400 }
      );
    }

    // Create notifications for all users
    let notifications;
    try {
      notifications = await Promise.all(
        userIds.map((userId: string) =>
          prisma.userNotification.create({
            data: {
              userId,
              title: title.trim(),
              message: message.trim(),
              type: type || "info",
              link: link?.trim() || null,
              sentBy: admin.id,
            },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          })
        )
      );
    } catch (dbError: any) {
      // Check for Prisma Client not generated
      if (
        dbError?.message?.includes("Cannot read properties of undefined") ||
        dbError?.message?.includes("reading 'create'") ||
        dbError?.message?.includes("userNotification is not a function")
      ) {
        return NextResponse.json(
          {
            error: "Prisma Client not generated. Please run: npx prisma generate",
            details: "The UserNotification model is not available in Prisma Client.",
          },
          { status: 500 }
        );
      }
      
      // Check for table not found
      if (
        dbError?.code === "P2021" ||
        dbError?.message?.includes("does not exist") ||
        (dbError?.message?.includes("table") && dbError?.message?.includes("not found"))
      ) {
        return NextResponse.json(
          {
            error: "Database table not found. Please run migrations: npm run db:migrate",
            details: "The UserNotification table does not exist in the database. Run 'npm run db:migrate' or 'npx prisma migrate dev' to create it.",
            migrationCommand: "npm run db:migrate",
          },
          { status: 500 }
        );
      }
      
      throw dbError;
    }

    return NextResponse.json({
      success: true,
      notifications,
      count: notifications.length,
    });
  } catch (error) {
    return handleError(error);
  }
}

