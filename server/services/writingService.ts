/**
 * Writing Service
 * Handles data operations for writing features
 */

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export class WritingService {
    /**
     * Get usage limits based on CEFR level
     */
    getUsageLimits(level: string | null | undefined): Record<string, number> {
        if (!level) {
            return {
                outline: 1,
                brainstorm: 1,
                thesis: 1,
                "language-pack": 2,
                rephrase: 3,
                expand: 3,
            };
        }

        const levelUpper = level.toUpperCase();

        // Beginner levels (A1, A2): More help allowed
        if (levelUpper === "A1" || levelUpper === "A2") {
            return {
                outline: 1,
                brainstorm: 1,
                thesis: 1,
                "language-pack": 3,
                rephrase: 3,
                expand: 3,
            };
        }

        // Intermediate levels (B1, B2): Moderate help
        if (levelUpper === "B1" || levelUpper === "B2") {
            return {
                outline: 1,
                brainstorm: 1,
                thesis: 1,
                "language-pack": 2,
                rephrase: 2,
                expand: 2,
            };
        }

        // Advanced levels (C1, C2): Limited help (challenge mode)
        return {
            outline: 1,
            brainstorm: 1,
            thesis: 1,
            "language-pack": 1,
            rephrase: 1,
            expand: 1,
        };
    }

    /**
     * Get usage count for a feature
     */
    async getUsageCount(userId: string, feature: string, taskId?: string) {
        try {
            return await prisma.writingLLMUsage.count({
                where: {
                    userId,
                    feature,
                    ...(taskId && { taskId }),
                },
            });
        } catch (error) {
            console.error("[WritingService] Error getting usage count:", error);
            // Return 0 if there's an error (e.g., table doesn't exist yet)
            return 0;
        }
    }

    /**
     * Get all usage counts for a task
     */
    async getAllUsageCounts(userId: string, taskId?: string) {
        try {
            const features = ["outline", "brainstorm", "thesis", "language-pack", "rephrase", "expand"];

            const usage = await prisma.writingLLMUsage.findMany({
                where: {
                    userId,
                    ...(taskId && { taskId }),
                    feature: {
                        in: features,
                    },
                },
                select: {
                    feature: true,
                },
            });

            const usageCounts: Record<string, number> = {};
            features.forEach((f) => {
                usageCounts[f] = 0;
            });

            usage.forEach((u) => {
                usageCounts[u.feature] = (usageCounts[u.feature] || 0) + 1;
            });

            return usageCounts;
        } catch (error) {
            console.error("[WritingService] Error getting all usage counts:", error);
            // Return empty counts if there's an error
            const features = ["outline", "brainstorm", "thesis", "language-pack", "rephrase", "expand"];
            const usageCounts: Record<string, number> = {};
            features.forEach((f) => {
                usageCounts[f] = 0;
            });
            return usageCounts;
        }
    }

    /**
     * Record usage of a feature
     */
    async recordUsage(userId: string, feature: string, taskId?: string) {
        return await prisma.writingLLMUsage.create({
            data: {
                userId,
                feature,
                taskId: taskId || null,
            },
        });
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
            return await prisma.userActivity.create({
                data: {
                    userId,
                    skill: "writing",
                    activityType: "exercise",
                    completed: true,
                    score: parseFloat(data.score.toString()),
                    duration: data.duration || null,
                    date: new Date(),
                    metadata: {
                        taskId: data.taskId,
                        taskTitle: data.taskTitle,
                        taskType: data.taskType,
                        targetWords: data.targetWords,
                        level: data.level,
                        wordCount: data.text?.split(/\s+/).length || 0,
                        scoringDetails: (data.scoringDetails || {}) as Prisma.InputJsonValue,
                    },
                },
            });
        } catch (error) {
            console.error("[WritingService] Error saving completion:", error);
            throw error;
        }
    }
}

export const writingService = new WritingService();

