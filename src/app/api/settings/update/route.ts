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

    // Validate language
    if (language && !["en", "vi"].includes(language)) {
      return NextResponse.json(
        { error: "Invalid language. Must be 'en' or 'vi'" },
        { status: 400 }
      );
    }

    // Validate theme
    if (theme && !["light", "dark"].includes(theme)) {
      return NextResponse.json(
        { error: "Invalid theme. Must be 'light' or 'dark'" },
        { status: 400 }
      );
    }

    // Update user preferences directly in User model
    const updateData: {
      language?: string;
      theme?: string;
    } = {};

    if (language) {
      updateData.language = language;
    }

    if (theme) {
      updateData.theme = theme;
    }

    // Only update if there's something to update
    if (Object.keys(updateData).length > 0) {
      try {
        await prisma.user.update({
          where: { id: session.user.id },
          data: updateData,
        });
      } catch (prismaError) {
        console.error("Prisma update error:", prismaError);
        // Check if it's a field not found error or Prisma client issue
        const errorMessage = prismaError instanceof Error ? prismaError.message : String(prismaError);

        if (errorMessage.includes("Unknown argument") ||
          errorMessage.includes("does not exist") ||
          errorMessage.includes("Unknown field")) {
          // Database or Prisma client might not have the fields yet
          console.warn("Fields might not exist. Please restart dev server to regenerate Prisma client.");
          return NextResponse.json(
            {
              error: "Database schema needs to be updated. Please restart the development server.",
              details: "The language and theme fields may not be available yet. Please restart the dev server."
            },
            { status: 500 }
          );
        }
        throw prismaError;
      }
    }

    // Store notifications in UserGoal metadata (as it's more complex data)
    if (notifications) {
      const settingsGoal = await prisma.userGoal.findFirst({
        where: {
          userId: session.user.id,
          type: "user_settings",
        },
      });

      const notificationsData = {
        email: notifications.email ?? true,
        push: notifications.push ?? false,
        dailyReminder: notifications.dailyReminder ?? true,
        weeklyReport: notifications.weeklyReport ?? true,
      };

      if (settingsGoal) {
        await prisma.userGoal.update({
          where: { id: settingsGoal.id },
          data: {
            metadata: { notifications: notificationsData },
          },
        });
      } else {
        await prisma.userGoal.create({
          data: {
            userId: session.user.id,
            type: "user_settings",
            target: 1,
            current: 1,
            completed: true,
            metadata: { notifications: notificationsData },
          },
        });
      }
    }

    // Get updated user to return current settings
    const updatedUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { language: true, theme: true },
    });

    const settingsGoal = await prisma.userGoal.findFirst({
      where: {
        userId: session.user.id,
        type: "user_settings",
      },
    });

    const defaultNotifications = {
      email: true,
      push: false,
      dailyReminder: true,
      weeklyReport: true,
    };

    const notificationsData = settingsGoal?.metadata
      ? (settingsGoal.metadata as { notifications?: typeof defaultNotifications }).notifications || defaultNotifications
      : defaultNotifications;

    return NextResponse.json({
      success: true,
      settings: {
        theme: updatedUser?.theme || "light",
        language: updatedUser?.language || "en",
        notifications: notificationsData,
      },
    });
  } catch (error) {
    console.error("Update settings error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to update settings", details: errorMessage },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user preferences from User model
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { language: true, theme: true },
    });

    // Get notifications from UserGoal metadata
    const settingsGoal = await prisma.userGoal.findFirst({
      where: {
        userId: session.user.id,
        type: "user_settings",
      },
    });

    const defaultNotifications = {
      email: true,
      push: false,
      dailyReminder: true,
      weeklyReport: true,
    };

    const notifications = settingsGoal?.metadata
      ? (settingsGoal.metadata as { notifications?: typeof defaultNotifications }).notifications || defaultNotifications
      : defaultNotifications;

    return NextResponse.json({
      success: true,
      settings: {
        theme: user?.theme || "light",
        language: user?.language || "en",
        notifications,
      },
    });
  } catch (error) {
    console.error("Get settings error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to get settings", details: errorMessage },
      { status: 500 }
    );
  }
}

