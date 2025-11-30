/**
 * Stats Controller
 * Handles business logic for user statistics
 */

import { statsService } from "../services/statsService";

export class StatsController {
    /**
     * Get user stats
     */
    async getStats(userId: string) {
        try {
            const stats = await statsService.getUserStats(userId);

            return {
                success: true,
                data: { stats },
            };
        } catch (error) {
            console.error("[StatsController] Error getting stats:", error);
            throw error;
        }
    }
}

export const statsController = new StatsController();

