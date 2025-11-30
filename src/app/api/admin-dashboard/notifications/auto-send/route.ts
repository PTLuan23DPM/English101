import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST: Check and send automatic notifications based on conditions
// This endpoint should be called by a cron job or scheduled task
export async function POST(req: NextRequest) {
  try {
    // Get all active automatic notifications
    const automaticNotifications = await prisma.notification.findMany({
      where: {
        notificationType: "AUTOMATIC",
        active: true,
      },
    });

    const results = [];

    for (const notification of automaticNotifications) {
      if (!notification.trigger) continue;

      const conditions = notification.conditions
        ? typeof notification.conditions === "string"
          ? JSON.parse(notification.conditions)
          : notification.conditions
        : {};

      const targetUserIds = notification.targetUserIds
        ? typeof notification.targetUserIds === "string"
          ? JSON.parse(notification.targetUserIds)
          : notification.targetUserIds
        : null;

      let usersToNotify: string[] = [];

      switch (notification.trigger) {
        case "STREAK_WARNING": {
          // Find users whose streak is about to expire
          const threshold = conditions.streakThreshold || 1;
          const users = await prisma.user.findMany({
            where: {
              streak: {
                lte: threshold,
                gt: 0,
              },
              lastActive: {
                not: null,
              },
            },
            select: { id: true },
          });
          usersToNotify = users.map((u) => u.id);
          break;
        }

        case "PRACTICE_REMINDER": {
          // Find users who haven't been active for X hours
          const hoursThreshold = conditions.hoursSinceLastActivity || 24;
          const thresholdDate = new Date();
          thresholdDate.setHours(thresholdDate.getHours() - hoursThreshold);

          const users = await prisma.user.findMany({
            where: {
              OR: [
                { lastActive: null },
                { lastActive: { lt: thresholdDate } },
              ],
            },
            select: { id: true },
          });
          usersToNotify = users.map((u) => u.id);
          break;
        }

        case "STREAK_EXPIRED": {
          // Find users who haven't practiced for X days and lost their streak
          const daysThreshold = conditions.daysWithoutPractice || 1;
          const thresholdDate = new Date();
          thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);

          const users = await prisma.user.findMany({
            where: {
              streak: 0,
              OR: [
                { lastActive: null },
                { lastActive: { lt: thresholdDate } },
              ],
            },
            select: { id: true },
          });
          usersToNotify = users.map((u) => u.id);
          break;
        }
      }

      // Filter by targetUserIds if specified
      if (targetUserIds && Array.isArray(targetUserIds) && targetUserIds.length > 0) {
        usersToNotify = usersToNotify.filter((id) => targetUserIds.includes(id));
      }

      // Send notifications to eligible users
      if (usersToNotify.length > 0) {
        // Check if we've already sent this notification recently (within last 24 hours)
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);

        const recentNotifications = await prisma.userNotification.findMany({
          where: {
            notificationId: notification.id,
            createdAt: {
              gte: oneDayAgo,
            },
          },
          select: { userId: true },
        });

        const recentUserIds = new Set(recentNotifications.map((n) => n.userId));
        const newUsersToNotify = usersToNotify.filter(
          (id) => !recentUserIds.has(id)
        );

        if (newUsersToNotify.length > 0) {
          // Create user notifications
          await prisma.userNotification.createMany({
            data: newUsersToNotify.map((userId) => ({
              userId,
              title: notification.title,
              message: notification.message,
              type: "warning", // Default type for automatic notifications
              sentBy: notification.authorId,
              notificationId: notification.id,
            })),
          });

          results.push({
            notificationId: notification.id,
            notificationTitle: notification.title,
            trigger: notification.trigger,
            sentTo: newUsersToNotify.length,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${automaticNotifications.length} automatic notifications`,
      results,
    });
  } catch (error) {
    console.error("[Auto Send Notifications] Error:", error);
    return NextResponse.json(
      { error: "Failed to process automatic notifications" },
      { status: 500 }
    );
  }
}

