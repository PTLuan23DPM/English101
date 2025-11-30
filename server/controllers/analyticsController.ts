/**
 * Analytics Controller
 * Handles business logic for analytics
 */

import { analyticsService } from "../services/analyticsService";

export class AnalyticsController {
    /**
     * Get analytics data
     */
    async getAnalytics(
        userId: string,
        filters?: {
            skill?: string;
            timeframe?: string;
        }
    ) {
        try {
            const activities = await analyticsService.getAnalytics(userId, filters);
            const analytics = analyticsService.formatAnalytics(activities);

            return {
                success: true,
                data: { analytics },
            };
        } catch (error) {
            console.error("[AnalyticsController] Error getting analytics:", error);
            throw error;
        }
    }
}

export const analyticsController = new AnalyticsController();

