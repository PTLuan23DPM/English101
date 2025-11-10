/**
 * Notifications Controller
 * Handles business logic for notifications
 */

import { notificationsService } from "../services/notificationsService";

export class NotificationsController {
    /**
     * Get all notifications for a user
     */
    async getNotifications(userId: string) {
        try {
            const notifications = await notificationsService.getNotifications(userId);
            const unreadCount = await notificationsService.getUnreadCount(userId);

            return {
                success: true,
                data: {
                    notifications,
                    unreadCount,
                },
            };
        } catch (error) {
            console.error("[NotificationsController] Error getting notifications:", error);
            throw error;
        }
    }

    /**
     * Mark notification as read
     */
    async markAsRead(notificationId: string, userId: string) {
        try {
            const result = await notificationsService.markAsRead(notificationId, userId);

            return {
                success: true,
                data: result,
            };
        } catch (error) {
            console.error("[NotificationsController] Error marking as read:", error);
            throw error;
        }
    }
}

export const notificationsController = new NotificationsController();

