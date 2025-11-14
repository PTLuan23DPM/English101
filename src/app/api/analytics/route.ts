import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/server/utils/auth";
import { analyticsController } from "@/server/controllers/analyticsController";

/**
 * Get analytics data for strengths and weaknesses
 * GET /api/analytics?skill=writing&timeframe=week
 */
export async function GET(req: NextRequest) {
    try {
        const session = await requireAuth();
        const userId = session.user.id;

        const searchParams = req.nextUrl.searchParams;
        const skill = searchParams.get("skill") || "all";
        const timeframe = searchParams.get("timeframe") || "all";

        const result = await analyticsController.getAnalytics(userId, {
            skill,
            timeframe,
        });

        return NextResponse.json(result.data, { status: result.success ? 200 : 500 });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        
        if (errorMessage === "Unauthorized") {
            return unauthorizedResponse();
        }

        console.error("[Analytics API] Error:", error);
        return NextResponse.json(
            { error: errorMessage || "Failed to fetch analytics" },
            { status: 500 }
        );
    }
}
