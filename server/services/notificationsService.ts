/**
 * Notifications Service
 * Handles data operations for notifications
 */

import prisma from "@/lib/prisma";

export class NotificationsService {
    /**
     * Get all notifications for a user
     */
    async getNotifications(userId: string) {
        try {
            // Check if model exists
            if (!prisma.userNotification) {
                console.warn("[NotificationsService] UserNotification model not available in Prisma client");
                return [];
            }

            const notifications = await prisma.userNotification.findMany({
                where: {
                    userId: userId,
                },
                orderBy: {
                    createdAt: "desc",
                },
                select: {
                    id: true,
                    title: true,
                    message: true,
                    type: true,
                    link: true,
                    read: true,
                    readAt: true,
                    createdAt: true,
                },
            });

            return notifications.map((notif) => ({
                id: notif.id,
                type: notif.type || "info",
                title: notif.title,
                message: notif.message,
                link: notif.link,
                read: notif.read,
                readAt: notif.readAt,
                createdAt: notif.createdAt,
            }));
        } catch (error: any) {
            console.error("[NotificationsService] Error fetching notifications:", error);
            // If table doesn't exist (P2021) or model not found, return empty array
            if (error?.code === "P2021" || error?.message?.includes("does not exist") || error?.message?.includes("userNotification")) {
                console.warn("[NotificationsService] UserNotification table not found, returning empty array");
                return [];
            }
            throw error;
        }
    }

    /**
     * Mark notification as read
     */
    async markAsRead(notificationId: string, userId: string) {
        try {
            // Check if model exists
            if (!prisma.userNotification) {
                throw new Error("UserNotification model not available in Prisma client");
            }

            // Verify the notification belongs to the user
            const notification = await prisma.userNotification.findFirst({
                where: {
                    id: notificationId,
                    userId: userId,
                },
            });

            if (!notification) {
                throw new Error("Notification not found or access denied");
            }

            // Update notification
            const updated = await prisma.userNotification.update({
                where: {
                    id: notificationId,
                },
                data: {
                    read: true,
                    readAt: new Date(),
                },
            });

            return {
                success: true,
                message: "Notification marked as read",
                notification: updated,
            };
        } catch (error: any) {
            console.error("[NotificationsService] Error marking as read:", error);
            // If table doesn't exist (P2021), return error message
            if (error?.code === "P2021" || error?.message?.includes("does not exist")) {
                throw new Error("UserNotification table does not exist. Please run database migrations.");
            }
            throw error;
        }
    }

    /**
     * Get unread count
     */
    async getUnreadCount(userId: string) {
        try {
            // Check if model exists
            if (!prisma.userNotification) {
                console.warn("[NotificationsService] UserNotification model not available in Prisma client");
                return 0;
            }

            const count = await prisma.userNotification.count({
                where: {
                    userId: userId,
                    read: false,
                },
            });
            return count;
        } catch (error: any) {
            console.error("[NotificationsService] Error getting unread count:", error);
            // If table doesn't exist (P2021) or model not found, return 0
            if (error?.code === "P2021" || error?.message?.includes("does not exist") || error?.message?.includes("userNotification")) {
                console.warn("[NotificationsService] UserNotification table not found, returning 0");
                return 0;
            }
            throw error;
        }
    }
}

export const notificationsService = new NotificationsService();

