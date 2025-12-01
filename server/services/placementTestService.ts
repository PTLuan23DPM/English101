/**
 * Placement Test Service
 * Handles data operations for placement tests
 */

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export class PlacementTestService {
    /**
     * Determine CEFR level based on score
     */
    determineCEFRLevel(score: number): { level: string; description: string } {
        if (score >= 23) {
            return { level: "C2", description: "Proficient" };
        } else if (score >= 19) {
            return { level: "C1", description: "Advanced" };
        } else if (score >= 15) {
            return { level: "B2", description: "Upper Intermediate" };
        } else if (score >= 11) {
            return { level: "B1", description: "Intermediate" };
        } else if (score >= 6) {
            return { level: "A2", description: "Elementary" };
        } else {
            return { level: "A1", description: "Beginner" };
        }
    }

    /**
     * Save placement test result
     */
    async saveTestResult(
        userId: string,
        data: {
            score: number;
            totalQuestions: number;
            answers: unknown[];
        }
    ) {
        try {
            console.log("[PlacementTestService] Saving test result for user:", userId);
            const { level, description } = this.determineCEFRLevel(data.score);
            console.log("[PlacementTestService] Determined CEFR level:", level);

            // Check if user exists
            const userExists = await prisma.user.findUnique({
                where: { id: userId },
                select: { id: true }
            });

            if (!userExists) {
                console.error("[PlacementTestService] User not found:", userId);
                throw new Error(`User with ID ${userId} not found`);
            }

            // Save test result
            console.log("[PlacementTestService] Creating PlacementTestResult...");
            const testResult = await prisma.placementTestResult.create({
                data: {
                    userId,
                    score: data.score,
                    totalQuestions: data.totalQuestions,
                    cefrLevel: level,
                    answers: data.answers as Prisma.InputJsonValue,
                },
            });
            console.log("[PlacementTestService] PlacementTestResult created:", testResult.id);

            // Update user's level and mark test as completed
            console.log("[PlacementTestService] Updating User...");
            await prisma.user.update({
                where: { id: userId },
                data: {
                    placementTestCompleted: true,
                    cefrLevel: level,
                    placementScore: data.score,
                    lastActive: new Date(),
                },
            });
            console.log("[PlacementTestService] User updated successfully");

            return {
                testResult,
                cefrLevel: level,
                description,
            };
        } catch (error: unknown) {
            const err = error as { code?: string; message?: string };
            console.error("[PlacementTestService] Error in saveTestResult:", error);
            console.error("[PlacementTestService] Error code:", err?.code);
            console.error("[PlacementTestService] Error message:", err?.message);
            throw error;
        }
    }

    /**
     * Get user's placement test result
     */
    async getTestResult(userId: string) {
        return await prisma.placementTestResult.findFirst({
            where: { userId },
            orderBy: { id: "desc" },
        });
    }
}

export const placementTestService = new PlacementTestService();

