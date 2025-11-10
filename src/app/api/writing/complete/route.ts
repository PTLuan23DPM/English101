import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/server/utils/auth";
import { writingController } from "@/server/controllers/writingController";

/**
 * Save writing task completion
 * POST /api/writing/complete
 */
export async function POST(req: NextRequest) {
    try {
        const session = await requireAuth();
        const userId = session.user.id;

        const data = await req.json();
        const { taskId, taskTitle, taskType, targetWords, score, level, duration, text, scoringDetails } = data;

        const result = await writingController.saveCompletion(userId, {
            taskId,
            taskTitle,
            taskType,
            targetWords,
            score,
            level,
            duration,
            text,
            scoringDetails,
        });

        return NextResponse.json(result.data, { status: 201 });
    } catch (error: any) {
        if (error.message === "Unauthorized") {
            return unauthorizedResponse();
        }

        if (error.message === "Missing required fields: taskId, score") {
            return NextResponse.json(
                { error: error.message },
                { status: 400 }
            );
        }

        console.error("[Writing Complete API] Error:", error);
        return NextResponse.json(
            {
                error: error.message || "Failed to save task completion",
                details: error.message || "Unknown error",
            },
            { status: 500 }
        );
    }
}
