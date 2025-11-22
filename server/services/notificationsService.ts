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
        } catch (error) {
            console.error("[NotificationsService] Error fetching notifications:", error);
            throw error;
        }
    }

    /**
     * Mark notification as read
     */
    async markAsRead(notificationId: string, userId: string) {
        try {
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
        } catch (error) {
            console.error("[NotificationsService] Error marking as read:", error);
            throw error;
        }
    }

    /**
     * Get unread count
     */
    async getUnreadCount(userId: string) {
        try {
            const count = await prisma.userNotification.count({
                where: {
                    userId: userId,
                    read: false,
                },
            });
            return count;
        } catch (error) {
            console.error("[NotificationsService] Error getting unread count:", error);
            throw error;
        }
    }
}

export const notificationsService = new NotificationsService();

