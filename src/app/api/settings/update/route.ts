import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { theme, language, notifications } = body;

    // Get or create user settings
    // For now, we'll store in user metadata or create a separate settings table
    // Since we don't have a Settings model yet, we'll store in UserGoal metadata as a workaround
    // Better approach: Create a UserSettings model

    // This is a simplified version - in production, create a proper UserSettings model
    let settingsGoal = await prisma.userGoal.findFirst({
      where: {
        userId: session.user.id,
        type: "user_settings",
      },
    });

    const settingsData = {
      theme: theme || "light",
      language: language || "en",
      notifications: notifications || {
        email: true,
        push: false,
        dailyReminder: true,
        weeklyReport: true,
      },
    };

    if (settingsGoal) {
      // Update existing
      await prisma.userGoal.update({
        where: { id: settingsGoal.id },
        data: {
          metadata: settingsData,
        },
      });
    } else {
      // Create new
      await prisma.userGoal.create({
        data: {
          userId: session.user.id,
          type: "user_settings",
          target: 1,
          current: 1,
          completed: true,
          metadata: settingsData,
        },
      });
    }

    return NextResponse.json({
      success: true,
      settings: settingsData,
    });
  } catch (error: any) {
    console.error("Update settings error:", error);
    return NextResponse.json(
      { error: "Failed to update settings", details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user settings
    const settingsGoal = await prisma.userGoal.findFirst({
      where: {
        userId: session.user.id,
        type: "user_settings",
      },
    });

    const defaultSettings = {
      theme: "light",
      language: "en",
      notifications: {
        email: true,
        push: false,
        dailyReminder: true,
        weeklyReport: true,
      },
    };

    return NextResponse.json({
      success: true,
      settings: (settingsGoal?.metadata as any) || defaultSettings,
    });
  } catch (error: any) {
    console.error("Get settings error:", error);
    return NextResponse.json(
      { error: "Failed to get settings", details: error.message },
      { status: 500 }
    );
  }
}

