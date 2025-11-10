import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * Get user progress data
 * GET /api/progress
 */
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;

        // Get user basic info
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                cefrLevel: true,
                placementTestCompleted: true,
                placementScore: true,
                createdAt: true,
            },
        });

        // Get all activities grouped by skill
        const activities = await prisma.userActivity.findMany({
            where: {
                userId,
                completed: true,
            },
            select: {
                skill: true,
                score: true,
                date: true,
            },
            orderBy: { date: "asc" },
        });

        // Calculate progress by skill
        const skillProgress: Record<string, any> = {};

        activities.forEach((activity) => {
            const skill = activity.skill;
            if (!skillProgress[skill]) {
                skillProgress[skill] = {
                    totalActivities: 0,
                    avgScore: 0,
                    scores: [],
                    firstActivity: activity.date,
                    lastActivity: activity.date,
                };
            }

            skillProgress[skill].totalActivities += 1;
            if (activity.score) {
                skillProgress[skill].scores.push(activity.score * 10);
            }
            skillProgress[skill].lastActivity = activity.date;
        });

        // Calculate averages and progress
        Object.keys(skillProgress).forEach((skill) => {
            const data = skillProgress[skill];
            if (data.scores.length > 0) {
                data.avgScore = data.scores.reduce((a: number, b: number) => a + b, 0) / data.scores.length;

                // Calculate trend (comparing first half vs second half)
                const midpoint = Math.floor(data.scores.length / 2);
                const firstHalf = data.scores.slice(0, midpoint);
                const secondHalf = data.scores.slice(midpoint);

                const firstHalfAvg =
                    firstHalf.length > 0
                        ? firstHalf.reduce((a: number, b: number) => a + b, 0) / firstHalf.length
                        : 0;
                const secondHalfAvg =
                    secondHalf.length > 0
                        ? secondHalf.reduce((a: number, b: number) => a + b, 0) / secondHalf.length
                        : 0;

                data.trend = secondHalfAvg - firstHalfAvg; // positive = improving
                data.progress = data.scores; // all scores for chart
            }
        });

        // Get user goals
        const goals = await prisma.userGoal.findMany({
            where: { userId },
            orderBy: [{ completed: "asc" }, { createdAt: "desc" }],
        });

        // Calculate completion stats
        const completedGoals = goals.filter((g) => g.completed).length;
        const totalGoals = goals.length;

        return NextResponse.json({
            success: true,
            progress: {
                user: {
                    cefrLevel: user?.cefrLevel,
                    placementTestCompleted: user?.placementTestCompleted,
                    placementScore: user?.placementScore,
                    memberSince: user?.createdAt,
                },
                skills: skillProgress,
                goals: {
                    total: totalGoals,
                    completed: completedGoals,
                    active: totalGoals - completedGoals,
                    list: goals,
                },
                summary: {
                    totalActivities: activities.length,
                    avgOverallScore:
                        activities.length > 0
                            ? activities
                                .filter((a) => a.score !== null)
                                .reduce((sum, a) => sum + (a.score || 0), 0) /
                            activities.filter((a) => a.score !== null).length
                            : 0,
                },
            },
        });
    } catch (error) {
        console.error("[Progress API] Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch progress" },
            { status: 500 }
        );
    }
}

