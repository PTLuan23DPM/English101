import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/server/utils/auth";
import { progressController } from "@/server/controllers/progressController";

/**
 * Get user progress data
 * GET /api/progress
 */
export async function GET() {
    try {
        const session = await requireAuth();
        const userId = session.user.id;

        const result = await progressController.getProgress(userId);

        return NextResponse.json(result.data, { status: result.success ? 200 : 500 });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        
        if (errorMessage === "Unauthorized") {
            return unauthorizedResponse();
        }

        console.error("[Progress API] Error:", error);
        return NextResponse.json(
            { error: errorMessage || "Failed to fetch progress" },
            { status: 500 }
        );
    }
}
