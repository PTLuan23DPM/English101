import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/server/utils/auth";
import { activityController } from "@/server/controllers/activityController";

/**
 * @swagger
 * /api/mediation/activities:
 *   get:
 *     summary: Get mediation activities
 *     tags: [Mediation]
 *     parameters:
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *         description: CEFR level filter (A1, A2, B1, B2, C1, C2)
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Activity type filter (MEDIATION_SUMMARIZE, MEDIATION_REPHRASE)
 *     responses:
 *       200:
 *         description: List of mediation activities
 *       401:
 *         description: Unauthorized
 */
export async function GET(req: NextRequest) {
    try {
        await requireAuth();

        const { searchParams } = new URL(req.url);
        const level = searchParams.get("level") || undefined;
        const type = searchParams.get("type") || undefined;

        const result = await activityController.getActivities("MEDIATION", { level, type });

        return NextResponse.json({
            activities: result.data,
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        
        if (errorMessage === "Unauthorized") {
            return unauthorizedResponse();
        }

        console.error("Error fetching mediation activities:", error);
        return NextResponse.json(
            { error: errorMessage || "Failed to fetch activities" },
            { status: 500 }
        );
    }
}
