import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/server/utils/auth";
import { progressController } from "@/server/controllers/progressController";

/**
 * Get user progress data
 * GET /api/progress
 */
export async function GET(req: NextRequest) {
    try {
        const session = await requireAuth();
        const userId = session.user.id;

        const result = await progressController.getProgress(userId);

        return NextResponse.json(result.data, { status: result.status });
    } catch (error: any) {
        if (error.message === "Unauthorized") {
            return unauthorizedResponse();
        }

        console.error("[Progress API] Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch progress" },
            { status: 500 }
        );
    }
}
