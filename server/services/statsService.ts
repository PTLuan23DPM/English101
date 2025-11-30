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
                    name: true,
                    email: true,
                    image: true,
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
            const skillScores: Record<string, { avg: number; count: number; totalScore: number }> = {};
            attemptsWithScore.forEach((att) => {
                const skill = att.activity.skill.toLowerCase();
                if (!skillScores[skill]) {
                    skillScores[skill] = { avg: 0, count: 0, totalScore: 0 };
                }
                skillScores[skill].totalScore += att.score || 0;
                skillScores[skill].count += 1;
            });

            // Calculate averages
            Object.keys(skillScores).forEach((skill) => {
                if (skillScores[skill].count > 0) {
                    skillScores[skill].avg = skillScores[skill].totalScore / skillScores[skill].count;
                }
                // Remove totalScore from final result
                delete (skillScores[skill] as any).totalScore;
            });

            // Get recent activities (last 7 days, only completed)
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            // Get recent activities (last 30 days for better coverage)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const recentAttempts = await prisma.attempt.findMany({
                where: {
                    userId,
                    submittedAt: { not: null, gte: thirtyDaysAgo },
                },
                select: {
                    id: true,
                    score: true,
                    submittedAt: true,
                    meta: true,
                    activity: {
                        select: {
                            id: true,
                            skill: true,
                            type: true,
                            title: true,
                            level: true,
                        },
                    },
                },
                orderBy: { submittedAt: "desc" },
                take: 20, // Get more to have better selection
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
                name: user.name,
                email: user.email,
                image: user.image,
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
                recentActivities: recentAttempts.map(att => {
                    const metadata = (att.meta as any) || {};
                    const score = att.score ? (att.score > 10 ? att.score / 10 : att.score) : null;
                    
                    return {
                        id: att.id,
                        skill: att.activity.skill,
                        activityType: att.activity.type,
                        score: score,
                        date: att.submittedAt?.toISOString() || null,
                        metadata: {
                            taskId: metadata.taskId || att.activity.id,
                            taskTitle: metadata.taskTitle || att.activity.title || `${att.activity.skill} Exercise`,
                            taskType: metadata.taskType || att.activity.type,
                            level: metadata.level || att.activity.level || "B1",
                            targetWords: metadata.targetWords,
                            ...metadata,
                        },
                    };
                }),
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

