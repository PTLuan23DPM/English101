import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// GET: Fetch all automatic notifications
export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Try to fetch with new schema, fallback to empty array if schema not migrated
    let notifications;
    try {
      notifications = await prisma.notification.findMany({
        where: {
          notificationType: "AUTOMATIC",
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    } catch (schemaError: unknown) {
      // If schema not migrated yet, return empty array
      const error = schemaError as { code?: string; message?: string };
      if (error.code === "P2021" || error.message?.includes("does not exist")) {
        console.warn("[Automatic Notifications] Schema not migrated yet, returning empty array");
        return NextResponse.json({
          success: true,
          notifications: [],
          warning: "Database schema needs to be migrated. Please run: npx prisma db push",
        });
      }
      throw schemaError;
    }

    // Parse conditions and targetUserIds JSON
    const notificationsWithParsedConditions = notifications.map((n) => {
      try {
        return {
          ...n,
          conditions: n.conditions
            ? typeof n.conditions === "string"
              ? JSON.parse(n.conditions)
              : n.conditions
            : null,
          targetUserIds: n.targetUserIds
            ? typeof n.targetUserIds === "string"
              ? JSON.parse(n.targetUserIds)
              : n.targetUserIds
            : null,
        };
      } catch (parseError) {
        console.error("Error parsing JSON:", parseError);
        return {
          ...n,
          conditions: null,
          targetUserIds: null,
        };
      }
    });

    return NextResponse.json({
      success: true,
      notifications: notificationsWithParsedConditions,
    });
  } catch (error: unknown) {
    console.error("[Automatic Notifications GET] Error:", error);
    const err = error as { message?: string; stack?: string };
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to fetch notifications",
        details: process.env.NODE_ENV === "development" ? err.stack : undefined,
      },
      { status: 500 }
    );
  }
}

// POST: Create a new automatic notification
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Always fetch user from database to ensure we have a valid ID
    if (!session.user.email) {
      console.error("[Automatic Notifications POST] No email in session");
      return NextResponse.json({ error: "User email not found in session" }, { status: 400 });
    }

    // Fetch user from database to get valid ID
    const author = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true },
    });

    if (!author) {
      console.error("[Automatic Notifications POST] User not found in database:", session.user.email);
      return NextResponse.json({ error: "User not found in database" }, { status: 404 });
    }

    // Verify user is admin
    if (author.role !== "ADMIN") {
      console.error("[Automatic Notifications POST] User is not admin:", author.id);
      return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
    }

    const authorId = author.id;
    console.log("[Automatic Notifications POST] Author ID:", authorId);

    const body = await req.json();
    const { title, message, trigger, active, conditions, targetUserIds } = body;

    if (!title || !message || !trigger) {
      return NextResponse.json(
        { error: "Title, message, and trigger are required" },
        { status: 400 }
      );
    }

    // Prepare targetUserIds - handle both array and null/undefined
    let targetUserIdsValue: string[] | null = null;
    if (targetUserIds && Array.isArray(targetUserIds) && targetUserIds.length > 0) {
      targetUserIdsValue = targetUserIds; // Prisma will handle JSON serialization for Json fields
    }

    const notification = await prisma.notification.create({
      data: {
        title,
        message,
        target: "all", // Automatic notifications target all users
        authorId,
        notificationType: "AUTOMATIC",
        trigger: trigger,
        active: active !== undefined ? active : true,
        conditions: conditions ? (typeof conditions === "string" ? conditions : JSON.stringify(conditions)) : Prisma.JsonNull,
        targetUserIds: targetUserIdsValue ?? Prisma.JsonNull,
      },
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
  } catch (error: unknown) {
    console.error("[Automatic Notifications POST] Error:", error);
    const err = error as { message?: string; code?: string; meta?: unknown; stack?: string };
    console.error("[Automatic Notifications POST] Error details:", {
      message: err.message,
      code: err.code,
      meta: err.meta,
    });
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to create notification",
        details: process.env.NODE_ENV === "development" ? err.stack : undefined,
      },
      { status: 500 }
    );
  }
}

