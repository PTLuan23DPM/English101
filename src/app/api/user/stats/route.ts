import { NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/server/utils/auth";
import { statsController } from "@/server/controllers/statsController";

/**
 * Get user statistics (avg score, total activities, streak, etc.)
 * GET /api/user/stats
 */
export async function GET() {
    try {
        const session = await requireAuth();
        const userId = session.user.id;

        const result = await statsController.getStats(userId);

        if (!result.success) {
            return NextResponse.json(
                { error: "Failed to fetch user stats", success: false },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, stats: result.data.stats }, { status: 200 });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        
        if (errorMessage === "Unauthorized") {
            return unauthorizedResponse();
        }

        console.error("[User Stats API] Error:", error);
        return NextResponse.json(
            { 
                success: false,
                error: errorMessage || "Failed to fetch user stats",
                stats: null
            },
            { status: 500 }
        );
    }
}

