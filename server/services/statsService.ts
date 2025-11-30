/**
 * Stats Service
 * Handles data operations for user statistics
 */

import prisma from "@/lib/prisma";

export class StatsService {
    /**
     * Get user stats
     */
    async getUserStats(userId: string) {
        try {
            // Get user basic info
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    createdAt: true,
                },
            });

            if (!user) {
                throw new Error("User not found");
            }

            // Get CEFR level from placement test result
            const placementTest = await prisma.placementTestResult.findFirst({
                where: { userId },
                orderBy: { completedAt: "desc" },
                select: { cefrLevel: true },
            });

            // Get all completed attempts (submittedAt is not null)
            const attempts = await prisma.attempt.findMany({
                where: {
                    userId,
                    submittedAt: { not: null },
                },
                select: {
                    id: true,
                    score: true,
                    submittedAt: true,
                    activity: {
                        select: {
                            skill: true,
                        },
                    },
                },
                orderBy: { submittedAt: "desc" },
            });

            // Calculate average score (only from attempts with scores)
            const attemptsWithScore = attempts.filter(att => att.score !== null);
            const avgScore =
                attemptsWithScore.length > 0
                    ? attemptsWithScore.reduce((sum, att) => sum + (att.score || 0), 0) / attemptsWithScore.length
                    : 0;

            // Calculate scores by skill (only completed attempts)
            const skillScores: Record<string, { avg: number; count: number }> = {};
            attemptsWithScore.forEach((att) => {
                const skill = att.activity.skill.toLowerCase();
                if (!skillScores[skill]) {
                    skillScores[skill] = { avg: 0, count: 0 };
                }
                skillScores[skill].avg += att.score || 0;
                skillScores[skill].count += 1;
            });

            Object.keys(skillScores).forEach((skill) => {
                skillScores[skill].avg = skillScores[skill].avg / skillScores[skill].count;
            });

            // Get recent activities (last 7 days, only completed)
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const recentAttempts = await prisma.attempt.findMany({
                where: {
                    userId,
                    submittedAt: { not: null, gte: sevenDaysAgo },
                },
                select: {
                    id: true,
                    score: true,
                    submittedAt: true,
                    meta: true,
                    activity: {
                        select: {
                            skill: true,
                            type: true,
                        },
                    },
                },
                orderBy: { submittedAt: "desc" },
                take: 10,
            });

            // Calculate streak from completed attempts
            const { calculateStreakFromActivities } = await import("@/lib/streak");
            const { streak, longestStreak } = await calculateStreakFromActivities(userId);

            // Get unique completed days
            const completedDays = new Set(
                attempts.map(att => att.submittedAt?.toISOString().split('T')[0]).filter(Boolean)
            ).size;

            // Convert score from 0-100 scale to 0-10 scale for display
            const avgScoreDisplay = avgScore > 10 ? avgScore / 10 : avgScore;

            return {
                avgScore: parseFloat(avgScoreDisplay.toFixed(2)),
                totalActivities: attempts.length,
                completedUnits: completedDays,
                streak: streak,
                longestStreak: longestStreak,
                lastActive: attempts[0]?.submittedAt || null,
                cefrLevel: placementTest?.cefrLevel || null,
                skillScores: Object.fromEntries(
                    Object.entries(skillScores).map(([skill, data]) => [
                        skill,
                        {
                            avg: data.avg > 10 ? data.avg / 10 : data.avg, // Convert to 0-10 scale
                            count: data.count,
                        }
                    ])
                ),
                recentActivities: recentAttempts.map(att => ({
                    id: att.id,
                    skill: att.activity.skill,
                    activityType: att.activity.type,
                    score: att.score ? (att.score > 10 ? att.score / 10 : att.score) : null, // Convert to 0-10 scale
                    date: att.submittedAt,
                    metadata: (att.meta as any) || {},
                })),
            };
        } catch (error: any) {
            // Handle database connection errors
            if (error?.code === "P1001" || error?.message?.includes("Authentication failed") || error?.message?.includes("database credentials")) {
                console.error("[StatsService] Database connection error:", error.message);
                throw new Error("Database connection failed. Please check your DATABASE_URL environment variable.");
            }
            throw error;
        }
    }
}

export const statsService = new StatsService();

