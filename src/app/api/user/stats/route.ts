import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * Get user statistics (avg score, total activities, streak, etc.)
 * GET /api/user/stats
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
                streak: true,
                longestStreak: true,
                lastActive: true,
            },
        });

        // Get all completed activities
        const activities = await prisma.userActivity.findMany({
            where: {
                userId,
                completed: true,
                score: { not: null },
            },
            select: {
                score: true,
                skill: true,
                date: true,
            },
            orderBy: { date: "desc" },
        });

        // Calculate average score
        const avgScore =
            activities.length > 0
                ? activities.reduce((sum, act) => sum + (act.score || 0), 0) /
                activities.length
                : 0;

        // Calculate scores by skill
        const skillScores: Record<string, { avg: number; count: number }> = {};
        activities.forEach((act) => {
            if (!skillScores[act.skill]) {
                skillScores[act.skill] = { avg: 0, count: 0 };
            }
            skillScores[act.skill].avg += act.score || 0;
            skillScores[act.skill].count += 1;
        });

        Object.keys(skillScores).forEach((skill) => {
            skillScores[skill].avg =
                skillScores[skill].avg / skillScores[skill].count;
        });

        // Get recent activities (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentActivities = await prisma.userActivity.findMany({
            where: {
                userId,
                completed: true,
                date: { gte: sevenDaysAgo },
            },
            select: {
                id: true,
                skill: true,
                metadata: true,
                activityType: true,
                score: true,
                date: true,
                metadata: true,
            },
            orderBy: { date: "desc" },
            take: 10,
        });

        return NextResponse.json({
            success: true,
            stats: {
                avgScore: parseFloat(avgScore.toFixed(2)),
                totalActivities: activities.length,
                streak: user?.streak || 0,
                longestStreak: user?.longestStreak || 0,
                lastActive: user?.lastActive,
                cefrLevel: user?.cefrLevel,
                skillScores,
                recentActivities,
            },
        });
    } catch (error) {
        console.error("[User Stats API] Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch user stats" },
            { status: 500 }
        );
    }
}

