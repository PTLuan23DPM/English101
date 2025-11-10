/**
 * Progress Controller
 * Handles business logic for user progress
 */

import { progressService } from "../services/progressService";

export class ProgressController {
    /**
     * Get user progress
     */
    async getProgress(userId: string) {
        try {
            const progress = await progressService.getUserProgress(userId);

            return {
                success: true,
                data: { progress },
            };
        } catch (error) {
            console.error("[ProgressController] Error getting progress:", error);
            throw error;
        }
    }
}

export const progressController = new ProgressController();

