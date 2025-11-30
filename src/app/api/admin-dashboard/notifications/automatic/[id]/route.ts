import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: Fetch a single automatic notification
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const notification = await prisma.notification.findUnique({
      where: {
        id,
        notificationType: "AUTOMATIC",
      },
    });

    if (!notification) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      notification: {
        ...notification,
        conditions: notification.conditions
          ? typeof notification.conditions === "string"
            ? JSON.parse(notification.conditions)
            : notification.conditions
          : null,
        targetUserIds: notification.targetUserIds
          ? typeof notification.targetUserIds === "string"
            ? JSON.parse(notification.targetUserIds)
            : notification.targetUserIds
          : null,
      },
    });
  } catch (error) {
    console.error("[Automatic Notification GET] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch notification" },
      { status: 500 }
    );
  }
}

// PUT: Update an automatic notification
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { title, message, trigger, active, conditions, targetUserIds } = body;

    const updateData: any = {};
    if (title) updateData.title = title;
    if (message) updateData.message = message;
    if (trigger) updateData.trigger = trigger;
    if (active !== undefined) updateData.active = active;
    if (conditions) updateData.conditions = JSON.stringify(conditions);
    if (targetUserIds !== undefined) {
      updateData.targetUserIds = targetUserIds && targetUserIds.length > 0
        ? JSON.stringify(targetUserIds)
        : null;
    }

    const notification = await prisma.notification.update({
      where: {
        id,
        notificationType: "AUTOMATIC",
      },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      notification: {
        ...notification,
        conditions: notification.conditions
          ? typeof notification.conditions === "string"
            ? JSON.parse(notification.conditions)
            : notification.conditions
          : null,
        targetUserIds: notification.targetUserIds
          ? typeof notification.targetUserIds === "string"
            ? JSON.parse(notification.targetUserIds)
            : notification.targetUserIds
          : null,
      },
    });
  } catch (error) {
    console.error("[Automatic Notification PUT] Error:", error);
    return NextResponse.json(
      { error: "Failed to update notification" },
      { status: 500 }
    );
  }
}

// DELETE: Delete an automatic notification
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await prisma.notification.delete({
      where: {
        id,
        notificationType: "AUTOMATIC",
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("[Automatic Notification DELETE] Error:", error);
    return NextResponse.json(
      { error: "Failed to delete notification" },
      { status: 500 }
    );
  }
}

