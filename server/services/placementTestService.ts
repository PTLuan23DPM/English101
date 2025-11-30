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
        try {
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
            // Use raw SQL to bypass Prisma client validation if client is not up to date
            try {
                // Try using Prisma client first (if it's up to date)
                await prisma.user.update({
                    where: { id: userId },
                    data: {
                        cefrLevel: level,
                        lastActive: new Date(),
                        placementScore: data.score,
                        placementTestCompleted: true,
                    } as any,
                });
            } catch (updateError: any) {
                // If Prisma client doesn't recognize fields, use raw SQL
                const isUnknownFieldError = 
                    updateError?.message?.includes("Unknown argument") ||
                    updateError?.message?.includes("cefrLevel") ||
                    updateError?.message?.includes("placementScore") ||
                    updateError?.message?.includes("placementTestCompleted") ||
                    updateError?.message?.includes("lastActive") ||
                    updateError?.code === "P2009" ||
                    updateError?.name === "PrismaClientValidationError";
                
                if (isUnknownFieldError) {
                    console.warn("[PlacementTestService] Prisma client fields not recognized, using raw SQL to update user. Please run 'npx prisma generate' after restarting the dev server.");
                    
                    // Use raw SQL to update directly in database
                    await prisma.$executeRawUnsafe(
                        `UPDATE "User" 
                         SET "cefrLevel" = $1, 
                             "lastActive" = $2, 
                             "placementScore" = $3, 
                             "placementTestCompleted" = $4,
                             "updatedAt" = NOW()
                         WHERE "id" = $5`,
                        level,
                        new Date(),
                        data.score,
                        true,
                        userId
                    );
                } else {
                    // Re-throw if it's a different error (e.g., database connection)
                    throw updateError;
                }
            }

            return {
                testResult,
                cefrLevel: level,
                description,
            };
        } catch (error: any) {
            // Handle database connection errors
            if (error?.code === "P1001" || error?.message?.includes("Authentication failed") || error?.message?.includes("database credentials")) {
                console.error("[PlacementTestService] Database connection error:", error.message);
                throw new Error("Database connection failed. Please check your DATABASE_URL environment variable.");
            }
            throw error;
        }
    }

    /**
     * Get user's placement test result
     */
    async getTestResult(userId: string) {
        try {
            return await prisma.placementTestResult.findFirst({
                where: { userId },
                orderBy: { id: "desc" },
            });
        } catch (error: any) {
            // Handle database connection errors
            if (error?.code === "P1001" || error?.message?.includes("Authentication failed") || error?.message?.includes("database credentials")) {
                console.error("[PlacementTestService] Database connection error:", error.message);
                throw new Error("Database connection failed. Please check your DATABASE_URL environment variable.");
            }
            throw error;
        }
    }
}

export const placementTestService = new PlacementTestService();

