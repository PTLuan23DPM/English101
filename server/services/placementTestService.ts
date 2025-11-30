/**
 * Placement Test Service
 * Handles data operations for placement tests
 */

import prisma from "@/lib/prisma";

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
            answers: any[];
        }
    ) {
        const { level, description } = this.determineCEFRLevel(data.score);

        // Save test result
        const testResult = await prisma.placementTestResult.create({
            data: {
                userId,
                score: data.score,
                totalQuestions: data.totalQuestions,
                cefrLevel: level,
                answers: data.answers,
            },
        });

        // Update user's level and mark test as completed
        await prisma.user.update({
            where: { id: userId },
            data: {
                placementTestCompleted: true,
                cefrLevel: level,
                placementScore: data.score,
                lastActive: new Date(),
            },
        });

        return {
            testResult,
            cefrLevel: level,
            description,
        };
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

