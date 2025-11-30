import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: Fetch all manual notifications
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const notifications = await prisma.notification.findMany({
      where: {
        notificationType: "MANUAL",
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      notifications,
    });
  } catch (error) {
    console.error("[Manual Notifications GET] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

// POST: Create a new manual notification
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Always fetch user from database to ensure we have a valid ID
    if (!session.user.email) {
      console.error("[Manual Notifications POST] No email in session");
      return NextResponse.json({ error: "User email not found in session" }, { status: 400 });
    }

    // Fetch user from database to get valid ID
    const author = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true },
    });

    if (!author) {
      console.error("[Manual Notifications POST] User not found in database:", session.user.email);
      return NextResponse.json({ error: "User not found in database" }, { status: 404 });
    }

    // Verify user is admin
    if (author.role !== "ADMIN") {
      console.error("[Manual Notifications POST] User is not admin:", author.id);
      return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
    }

    const authorId = author.id;

    const body = await req.json();
    const { title, message, target, active } = body;

    if (!title || !message) {
      return NextResponse.json(
        { error: "Title and message are required" },
        { status: 400 }
      );
    }

    const notification = await prisma.notification.create({
      data: {
        title,
        message,
        target: target || "all",
        authorId,
        notificationType: "MANUAL",
        active: active !== undefined ? active : true,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      notification,
    });
  } catch (error) {
    console.error("[Manual Notifications POST] Error:", error);
    return NextResponse.json(
      { error: "Failed to create notification" },
      { status: 500 }
    );
  }
}

