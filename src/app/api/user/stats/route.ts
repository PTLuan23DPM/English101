import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/server/utils/auth";
import { statsController } from "@/server/controllers/statsController";

/**
 * Get user statistics (avg score, total activities, streak, etc.)
 * GET /api/user/stats
 */
export async function GET(req: NextRequest) {
    try {
        const session = await requireAuth();
        const userId = session.user.id;

        const result = await statsController.getStats(userId);

        return NextResponse.json(result.data, { status: result.status });
    } catch (error: any) {
        if (error.message === "Unauthorized") {
            return unauthorizedResponse();
        }

        console.error("[User Stats API] Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch user stats" },
            { status: 500 }
        );
    }
}

