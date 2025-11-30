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
            if (!userId) {
                throw new Error("UserId is required");
            }

            const user = await userService.getUserById(userId);
            if (!user) {
                throw new Error("User not found");
            }

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
        } catch (error: unknown) {
            console.error("[WritingController] Error getting usage:", error);
            const message = error instanceof Error ? error.message : "Failed to get usage";
            // Fallback: allow usage with default limits to avoid blocking UX
            const fallbackValue = {
                feature,
                limit: 1,
                used: 0,
                remaining: 1,
                isAvailable: true,
                fallback: true,
                error: message,
            };
            return {
                success: true,
                data: fallbackValue,
                fallback: true,
            };
        }
    }

    /**
     * Get all usage limits and current usage for a task
     */
    async getAllUsage(userId: string, taskId?: string) {
        try {
            if (!userId) {
                throw new Error("UserId is required");
            }

            const user = await userService.getUserById(userId);
            if (!user) {
                throw new Error("User not found");
            }

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
        } catch (error: unknown) {
            console.error("[WritingController] Error getting all usage:", error);
            const message = error instanceof Error ? error.message : "Failed to get all usage";
            // Fallback: return default allowance so UI stays functional
            const fallbackFeatures = ["outline", "brainstorm", "thesis", "language-pack", "rephrase", "expand"];
            const fallbackResult: Record<string, {
                limit: number;
                used: number;
                remaining: number;
                isAvailable: boolean;
                fallback?: boolean;
                error?: string;
            }> = {};

            fallbackFeatures.forEach((feature) => {
                fallbackResult[feature] = {
                    limit: 1,
                    used: 0,
                    remaining: 1,
                    isAvailable: true,
                    fallback: true,
                    error: message,
                };
            });

            return {
                success: true,
                data: fallbackResult,
                fallback: true,
            };
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
            // Non-fatal fallback: pretend success so user can continue
            return {
                success: true,
                message: "Usage recorded in fallback mode",
                fallback: true,
            };
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
            scoringDetails?: Record<string, unknown>;
        }
    ) {
        try {
            if (!userId) {
                throw new Error("UserId is required");
            }

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

            // Mark first writing task as completed in Getting Started
            try {
                const { gettingStartedService } = await import("../services/gettingStartedService");
                await gettingStartedService.markTaskCompleted(userId, "first_writing");
            } catch (error) {
                console.warn("[WritingController] Failed to mark getting started task:", error);
                // Don't fail the request if this fails
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
        } catch (error: unknown) {
            console.error("[WritingController] Error saving completion:", error);
            const message = error instanceof Error ? error.message : "Failed to save completion";
            // Fallback: respond success to keep UX, but flag the issue
            return {
                success: true,
                data: {
                    activityId: null,
                    message: "Completion accepted (fallback mode)",
                    streak: 0,
                    longestStreak: 0,
                    isNewDay: false,
                    fallback: true,
                    error: message,
                },
            };
        }
    }
}

export const writingController = new WritingController();

