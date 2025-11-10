/**
 * Writing Controller
 * Handles business logic for writing features
 */

import { writingService } from "../services/writingService";
import { userService } from "../services/userService";
import { updateStreakAfterActivity } from "@/lib/streak";

export class WritingController {
    /**
     * Get usage limits and current usage for a feature
     */
    async getUsage(userId: string, feature: string, taskId?: string) {
        try {
            const user = await userService.getUserById(userId);
            const limits = writingService.getUsageLimits(user?.cefrLevel);
            const usageCount = await writingService.getUsageCount(userId, feature, taskId);

            const limit = limits[feature] || 0;
            const remaining = Math.max(0, limit - usageCount);
            const isAvailable = remaining > 0;

            return {
                success: true,
                data: {
                    feature,
                    limit,
                    used: usageCount,
                    remaining,
                    isAvailable,
                },
            };
        } catch (error) {
            console.error("[WritingController] Error getting usage:", error);
            throw error;
        }
    }

    /**
     * Get all usage limits and current usage for a task
     */
    async getAllUsage(userId: string, taskId?: string) {
        try {
            const user = await userService.getUserById(userId);
            const limits = writingService.getUsageLimits(user?.cefrLevel);
            const usageCounts = await writingService.getAllUsageCounts(userId, taskId);

            const features = ["outline", "brainstorm", "thesis", "language-pack", "rephrase", "expand"];
            const result: Record<string, {
                limit: number;
                used: number;
                remaining: number;
                isAvailable: boolean;
            }> = {};

            features.forEach((feature) => {
                const limit = limits[feature] || 0;
                const used = usageCounts[feature] || 0;
                const remaining = Math.max(0, limit - used);
                const isAvailable = remaining > 0;

                result[feature] = {
                    limit,
                    used,
                    remaining,
                    isAvailable,
                };
            });

            return {
                success: true,
                data: result,
            };
        } catch (error) {
            console.error("[WritingController] Error getting all usage:", error);
            throw error;
        }
    }

    /**
     * Record usage of a feature
     */
    async recordUsage(userId: string, feature: string, taskId?: string) {
        try {
            await writingService.recordUsage(userId, feature, taskId);
            return {
                success: true,
                message: "Usage recorded successfully",
            };
        } catch (error) {
            console.error("[WritingController] Error recording usage:", error);
            throw error;
        }
    }

    /**
     * Save writing task completion
     */
    async saveCompletion(
        userId: string,
        data: {
            taskId: string;
            taskTitle?: string;
            taskType?: string;
            targetWords?: string;
            score: number;
            level?: string;
            duration?: number | null;
            text?: string;
            scoringDetails?: any;
        }
    ) {
        try {
            // Validate required fields
            if (!data.taskId || data.score === undefined) {
                throw new Error("Missing required fields: taskId, score");
            }

            // Save completion
            const userActivity = await writingService.saveCompletion(userId, data);

            // Update streak
            let streakData;
            try {
                streakData = await updateStreakAfterActivity(userId);
            } catch (streakError) {
                console.error("[WritingController] Streak update error:", streakError);
                streakData = { streak: 0, longestStreak: 0, isNewDay: false };
            }

            return {
                success: true,
                data: {
                    activityId: userActivity.id,
                    message: "Task completion saved successfully",
                    streak: streakData.streak,
                    longestStreak: streakData.longestStreak,
                    isNewDay: streakData.isNewDay,
                },
            };
        } catch (error) {
            console.error("[WritingController] Error saving completion:", error);
            throw error;
        }
    }
}

export const writingController = new WritingController();

