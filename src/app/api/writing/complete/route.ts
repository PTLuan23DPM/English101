import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { updateStreakAfterActivity } from "@/lib/streak";

/**
 * Save writing task completion
 * POST /api/writing/complete
 */
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user || !session.user.id) {
            console.error("[Writing Complete API] No session or user ID");
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;
        const data = await req.json();
        const { taskId, taskTitle, taskType, targetWords, score, level, duration, text, scoringDetails } = data;

        console.log("[Writing Complete API] Received data:", {
            taskId,
            taskTitle,
            score,
            level,
            hasText: !!text,
        });

        if (!taskId || score === undefined) {
            console.error("[Writing Complete API] Missing required fields:", {
                hasTaskId: !!taskId,
                hasScore: score !== undefined,
            });
            return NextResponse.json(
                { error: "Missing required fields: taskId, score" },
                { status: 400 }
            );
        }

        // Save to UserActivity
        try {
            const userActivity = await prisma.userActivity.create({
                data: {
                    userId,
                    skill: "writing",
                    activityType: "exercise",
                    completed: true,
                    score: parseFloat(score),
                    duration: duration || null,
                    date: new Date(),
                    metadata: {
                        taskId,
                        taskTitle,
                        taskType,
                        targetWords,
                        level,
                        wordCount: text?.split(/\s+/).length || 0,
                        scoringDetails: scoringDetails || {},
                    },
                },
            });

            console.log("[Writing Complete API] Activity created:", userActivity.id);

            // Update user's last active and check streak
            let streakData;
            try {
                streakData = await updateStreakAfterActivity(userId);
                console.log("[Writing Complete API] Streak updated:", streakData);
            } catch (streakError) {
                console.error("[Writing Complete API] Streak update error:", streakError);
                // Continue even if streak update fails
                streakData = { streak: 0, longestStreak: 0, isNewDay: false };
            }

            return NextResponse.json({
                success: true,
                activityId: userActivity.id,
                message: "Task completion saved successfully",
                streak: streakData.streak,
                longestStreak: streakData.longestStreak,
                isNewDay: streakData.isNewDay,
            });
        } catch (dbError: any) {
            console.error("[Writing Complete API] Database error:", dbError);
            return NextResponse.json(
                {
                    error: "Failed to save task completion",
                    details: dbError.message || "Database error",
                },
                { status: 500 }
            );
        }
    } catch (error: any) {
        console.error("[Writing Complete API] Error:", error);
        return NextResponse.json(
            {
                error: "Failed to save task completion",
                details: error.message || "Unknown error",
            },
            { status: 500 }
        );
    }
}

